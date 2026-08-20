import { auditService } from './auditService';
import { database, now, uuid } from './db';
import { decryptMessageFromContact, encryptMessageForContact } from './cryptoService';
import { meshService } from './mesh-service';
import { captureRescueLocation } from './rescue-location';
import type { EncryptedMessage, MeshStatus, Report as MeshReport, RoutingEntry as MeshRoutingEntry } from './types';
import type { Message, Report as StoredReport, RoutingEntry as StoredRoutingEntry } from '../types/security-data';

function encode(value: unknown): string { return JSON.stringify(value); }
function decode<T>(value: string): T { return JSON.parse(value) as T; }

export async function sendEncryptedText(input: { chatId: string; contactId: string; receiverId: string; senderId: string; plaintext: string; ttl?: number }): Promise<{ message: Message; delivered: boolean }> {
  const encrypted = await encryptMessageForContact(input.contactId, input.plaintext);
  const messageId = uuid();
  const payload: EncryptedMessage = { message_id: messageId, sender_id: input.senderId, receiver_id: input.receiverId, content_type: 'text', content: encode(encrypted), timestamp: now(), ttl: input.ttl ?? 8 };
  const delivered = await meshService.sendEncryptedMessage(input.receiverId, payload);
  const message: Message = { id: messageId, chat_id: input.chatId, sender_id: input.senderId, receiver_id: input.receiverId, content_type: 'text', content: payload.content, timestamp: payload.timestamp, status: delivered ? 'sent' : 'sent', ttl: payload.ttl, message_id_for_dedup: messageId };
  await database.saveMessage(message);
  await auditService.logAction(delivered ? 'message_sent' : 'message_queued', { message_id: messageId, receiver_id: input.receiverId, encrypted: true });
  return { message, delivered };
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

export const airMeshIntegration = { sendEncryptedText, receiveEncryptedMessage, broadcastSos, persistRoutingTable, getPersistedMeshStatus, saveLocalReport, syncReportsToBase };
