import { auditService } from './auditService';
import { database, now, uuid } from './db';
import { decryptMessageFromContact, encryptMessageForContact } from './cryptoService';
import { meshService } from './mesh-service';
import { captureRescueLocation } from './rescue-location';
import { notifyPeerEligibleForRetry } from './retry-notifier';
import { pendingMessageWarning, shouldAttemptEnvelope, type PendingMessageWarning } from './retry-policy';
import { getRetryPreferences } from './retry-preferences';
import { buildRedactedDiagnosticsExport } from './diagnostics-export';
import type { EncryptedMessage, MeshStatus, Report as MeshReport, RoutingEntry as MeshRoutingEntry } from './types';
import type { Message, OutboxEnvelope, Report as StoredReport, RoutingEntry as StoredRoutingEntry } from '../types/security-data';

function encode(value: unknown): string { return JSON.stringify(value); }
function decode<T>(value: string): T { return JSON.parse(value) as T; }

export async function sendEncryptedText(input: { chatId: string; contactId: string; receiverId: string; senderId: string; plaintext: string; ttl?: number; messageId?: string }): Promise<{ message: Message; delivered: false; accepted: boolean }> {
  const encrypted = await encryptMessageForContact(input.contactId, input.plaintext);
  const messageId = input.messageId ?? uuid();
  const payload: EncryptedMessage = { message_id: messageId, sender_id: input.senderId, receiver_id: input.receiverId, content_type: 'text', content: encode(encrypted), timestamp: now(), ttl: input.ttl ?? 8 };
  const envelope: OutboxEnvelope = { message_id: messageId, chat_id: input.chatId, destination_id: input.receiverId, encrypted_payload: JSON.stringify(payload), ttl: payload.ttl, created_at: payload.timestamp, last_attempt_at: null, attempt_count: 0, status: 'queued' };
  await database.saveOutboxEnvelope(envelope);
  const accepted = await meshService.sendWithMode({ kind: 'mesh', receiverId: input.receiverId }, payload);
  const attemptedAt = now();
  await database.updateOutboxEnvelope(messageId, { status: accepted ? 'sent' : 'queued', last_attempt_at: attemptedAt, attempt_count: 1 });
  const message: Message = { id: messageId, chat_id: input.chatId, sender_id: input.senderId, receiver_id: input.receiverId, content_type: 'text', content: payload.content, timestamp: payload.timestamp, status: accepted ? 'sent' : 'queued', ttl: payload.ttl, message_id_for_dedup: messageId };
  await database.saveMessage(message);
  await auditService.logAction(accepted ? 'message_transport_accepted' : 'message_queued', { message_id: messageId, receiver_id: input.receiverId, encrypted: true, recipient_delivery_confirmed: false });
  return { message, delivered: false, accepted };
}

/** Attempts durable envelopes only when the caller has established an eligible nearby transport. */
export async function retryQueuedEncryptedEnvelopes(): Promise<{ attempted: number; accepted: number; skipped: number }> {
  const queued = await database.getQueuedOutboxEnvelopes();
  const routes = await meshService.getRoutingTable();
  const preferences = await getRetryPreferences();
  let accepted = 0;
  let attempted = 0;
  for (const envelope of queued) {
    const directlyConnected = meshService.isPeerConnected(envelope.destination_id);
    if (!directlyConnected && !shouldAttemptEnvelope(envelope, routes, Date.now(), { maxAttempts: preferences.maxAttempts, minIntervalMs: preferences.retryIntervalMinutes * 60_000 })) continue;
    let payload: EncryptedMessage;
    try { payload = decode<EncryptedMessage>(envelope.encrypted_payload); }
    catch { continue; }
    attempted += 1;
    const sent = await meshService.sendWithMode({ kind: 'mesh', receiverId: envelope.destination_id }, payload);
    const attemptCount = envelope.attempt_count + 1;
    await database.updateOutboxEnvelope(envelope.message_id, { status: sent ? 'sent' : 'queued', last_attempt_at: now(), attempt_count: attemptCount });
    if (sent) accepted += 1;
  }
  if (attempted) await auditService.logAction('outbox_retry_completed', { attempted, immediate_transport_accepted: accepted, recipient_delivery_confirmed: false });
  return { attempted, accepted, skipped: queued.length - attempted };
}

export async function getPendingMessageWarnings(): Promise<Record<string, PendingMessageWarning>> {
  const [queued, routes, preferences] = await Promise.all([database.getQueuedOutboxEnvelopes(), meshService.getRoutingTable(), getRetryPreferences()]);
  return Object.fromEntries(queued.map((envelope) => [envelope.message_id, pendingMessageWarning(envelope, routes, Date.now(), preferences.maxAttempts)]).filter((entry): entry is [string, PendingMessageWarning] => entry[1] !== null));
}

/** A user-requested retry can exceed automatic limits but still never becomes a delivery claim without a verified receipt. */
export async function retryOutboxEnvelopeNow(messageId: string): Promise<{ accepted: boolean; reason?: string }> {
  const envelope = (await database.getQueuedOutboxEnvelopes()).find((entry) => entry.message_id === messageId);
  if (!envelope) return { accepted: false, reason: 'The message is no longer queued locally.' };
  let payload: EncryptedMessage;
  try { payload = decode<EncryptedMessage>(envelope.encrypted_payload); } catch { return { accepted: false, reason: 'The queued envelope is corrupted.' }; }
  const accepted = await meshService.sendWithMode({ kind: 'mesh', receiverId: envelope.destination_id }, payload);
  await database.updateOutboxEnvelope(envelope.message_id, { status: accepted ? 'sent' : 'queued', last_attempt_at: now(), attempt_count: envelope.attempt_count + 1 });
  await auditService.logAction('outbox_manual_retry', { message_id: envelope.message_id, destination_id: envelope.destination_id, immediate_transport_accepted: accepted, recipient_delivery_confirmed: false });
  return { accepted };
}

export async function createRedactedDiagnosticsExport(): Promise<string> {
  await database.initialize();
  const [mesh_status, routes, outbox, relay_queue] = await Promise.all([meshService.getMeshStatus(), meshService.getRoutingTable(), database.getQueuedOutboxEnvelopes(), database.getQueuedRelayEnvelopes()]);
  return buildRedactedDiagnosticsExport({ generated_at: now(), mesh_status, routes, connected_peers: meshService.getConnectedPeerIds(), outbox, relay_queue });
}

let retryEventsWired = false;
export function enableAutomaticRetry(): void {
  if (retryEventsWired) return;
  retryEventsWired = true;
  meshService.onRetryOpportunity((event) => { void (async () => { const result = await retryQueuedEncryptedEnvelopes(); if (result.attempted > 0) { await auditService.logAction('peer_retry_eligible', { event: event.kind, peer_id: event.peerId ?? null, attempted: result.attempted, immediate_transport_accepted: result.accepted, recipient_delivery_confirmed: false }); await notifyPeerEligibleForRetry({ peerId: event.peerId, attempted: result.attempted }); } })(); });
}

/** Call only after the authenticated mesh engine verifies the recipient’s end-to-end receipt MAC. */
export async function recordVerifiedDeliveryReceipt(input: { messageId: string; recipientId: string; receiptPayload: string; verifiedAt?: string }): Promise<void> {
  const verifiedAt = input.verifiedAt ?? now();
  await database.saveDeliveryReceipt({ message_id: input.messageId, recipient_id: input.recipientId, receipt_payload: input.receiptPayload, verified_at: verifiedAt });
  await database.updateMessageStatus(input.messageId, 'delivered');
  await auditService.logAction('message_delivery_receipt_verified', { message_id: input.messageId, recipient_id: input.recipientId, verified_at: verifiedAt });
}

export async function receiveEncryptedMessage(contactId: string, payload: EncryptedMessage, chatId: string): Promise<{ message: Message; plaintext: string }> {
  const encrypted = decode<Parameters<typeof decryptMessageFromContact>[1]>(payload.content);
  const plaintext = await decryptMessageFromContact(contactId, encrypted);
  const message: Message = { id: payload.message_id, chat_id: chatId, sender_id: payload.sender_id, receiver_id: payload.receiver_id, content_type: payload.content_type, content: payload.content, timestamp: payload.timestamp, status: 'delivered', ttl: payload.ttl, message_id_for_dedup: payload.message_id };
  await database.saveMessage(message);
  await auditService.logAction('message_received', { message_id: payload.message_id, sender_id: payload.sender_id, encrypted: true });
  return { message, plaintext };
}

export async function broadcastSos(senderId: string, senderName: string, message = 'Emergency assistance requested'): Promise<boolean> {
  const captured = await captureRescueLocation();
  const payload: EncryptedMessage = { message_id: uuid(), sender_id: senderId, receiver_id: '*', content_type: 'ack', content: encode({ kind: 'sos', senderName, message, ...(captured.state === 'captured' ? { location: captured.location } : {}) }), timestamp: now(), ttl: 8 };
  const delivered = await meshService.broadcastMessage(payload);
  await auditService.logAction('sos_triggered', { message_id: payload.message_id, delivered, sender_id: senderId, location_included: captured.state === 'captured', location_state: captured.state });
  return delivered;
}

export async function persistRoutingTable(entries: MeshRoutingEntry[]): Promise<void> {
  const normalized: StoredRoutingEntry[] = entries.map((entry) => ({ device_id: entry.destination_device_id, next_hop_id: entry.next_hop_device_id, hop_count: entry.hop_count, updated_at: entry.updated_at }));
  await database.updateRoutingTable(normalized);
  await auditService.logAction('routing_table_updated', { entry_count: normalized.length });
}

export async function getPersistedMeshStatus(): Promise<MeshStatus> { const status = await meshService.getMeshStatus(); await persistRoutingTable(await meshService.getRoutingTable()); return status; }

export async function saveLocalReport(report: StoredReport): Promise<void> { await database.saveReport(report); await auditService.logAction('report_created', { report_id: report.id, severity: report.severity, sync_status: report.sync_status }); }

export async function syncReportsToBase(reports: MeshReport[], baseUrl?: string): Promise<boolean> { const result = await meshService.syncReportsToBase(reports, baseUrl); await auditService.logAction(result ? 'courier_sync_base_success' : 'courier_sync_base_failed', { report_count: reports.length, base_url_configured: Boolean(baseUrl) }); return result; }

export const airMeshIntegration = { sendEncryptedText, retryQueuedEncryptedEnvelopes, retryOutboxEnvelopeNow, getPendingMessageWarnings, createRedactedDiagnosticsExport, enableAutomaticRetry, recordVerifiedDeliveryReceipt, receiveEncryptedMessage, broadcastSos, persistRoutingTable, getPersistedMeshStatus, saveLocalReport, syncReportsToBase };
