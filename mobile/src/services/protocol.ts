import type { EncryptedMessage, RoutingEntry } from './types';

export const CHUNK_SIZE = 512;
export const DEFAULT_TTL = 5;
export const CHUNK_EXPIRY_MS = 60_000;

export interface MessageChunk {
  message_id: string;
  sequence_number: number;
  total_chunks: number;
  ttl: number;
  timestamp: string;
  payload: string;
}

export function encodeMessage(payload: EncryptedMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

export function decodeMessage(bytes: Uint8Array): EncryptedMessage {
  return JSON.parse(new TextDecoder().decode(bytes)) as EncryptedMessage;
}

export function chunkMessage(payload: EncryptedMessage, chunkSize = CHUNK_SIZE): MessageChunk[] {
  const encoded = encodeMessage(payload);
  const total = Math.max(1, Math.ceil(encoded.byteLength / chunkSize));
  const chunks: MessageChunk[] = [];
  for (let sequence = 0; sequence < total; sequence += 1) {
    const slice = encoded.slice(sequence * chunkSize, Math.min(encoded.byteLength, (sequence + 1) * chunkSize));
    let binary = '';
    slice.forEach((byte) => { binary += String.fromCharCode(byte); });
    chunks.push({
      message_id: payload.message_id,
      sequence_number: sequence,
      total_chunks: total,
      ttl: payload.ttl || DEFAULT_TTL,
      timestamp: payload.timestamp,
      payload: btoa(binary),
    });
  }
  return chunks;
}

export class ChunkAssembler {
  private readonly chunks = new Map<string, Map<number, MessageChunk>>();
  private readonly seen = new Set<string>();
  private readonly touched = new Map<string, number>();

  hasSeen(messageId: string): boolean {
    return this.seen.has(messageId);
  }

  accept(chunk: MessageChunk): EncryptedMessage | null {
    this.cleanupExpired();
    if (this.seen.has(chunk.message_id)) return null;
    if (!chunk.message_id || chunk.total_chunks < 1 || chunk.total_chunks > 2048 || chunk.sequence_number < 0 || chunk.sequence_number >= chunk.total_chunks || !chunk.payload) return null;
    const messageChunks = this.chunks.get(chunk.message_id) ?? new Map<number, MessageChunk>();
    messageChunks.set(chunk.sequence_number, chunk);
    this.chunks.set(chunk.message_id, messageChunks);
    this.touched.set(chunk.message_id, Date.now());
    if (messageChunks.size < chunk.total_chunks) return null;
    const ordered = Array.from(messageChunks.values()).sort((a, b) => a.sequence_number - b.sequence_number);
    if (ordered.some((part, index) => part.sequence_number !== index)) return null;
    const binary = ordered.map((part) => atob(part.payload)).join('');
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const message = decodeMessage(bytes);
    this.seen.add(chunk.message_id);
    this.chunks.delete(chunk.message_id);
    this.touched.delete(chunk.message_id);
    return message;
  }

  markSeen(messageId: string): void {
    this.seen.add(messageId);
    this.chunks.delete(messageId);
    this.touched.delete(messageId);
  }

  cleanupExpired(now = Date.now()): void {
    for (const [messageId, touchedAt] of this.touched) {
      if (now - touchedAt > CHUNK_EXPIRY_MS) {
        this.touched.delete(messageId);
        this.chunks.delete(messageId);
      }
    }
  }
}

export function shouldForward(message: EncryptedMessage, routing: RoutingEntry[], selfId: string): boolean {
  if (message.receiver_id === selfId || message.ttl <= 0) return false;
  return routing.some((entry) => entry.destination_device_id === message.receiver_id && entry.next_hop_device_id !== selfId);
}

export function decrementTtl(message: EncryptedMessage): EncryptedMessage {
  return { ...message, ttl: Math.max(0, message.ttl - 1) };
}

export function mergeRoutingTable(local: RoutingEntry[], received: RoutingEntry[], now = new Date().toISOString()): RoutingEntry[] {
  const merged = new Map(local.map((entry) => [entry.destination_device_id, entry]));
  for (const incoming of received) {
    if (incoming.hop_count < 1) continue;
    const candidate = { ...incoming, hop_count: incoming.hop_count + 1, updated_at: now };
    const current = merged.get(candidate.destination_device_id);
    if (!current || candidate.hop_count < current.hop_count) merged.set(candidate.destination_device_id, candidate);
  }
  return Array.from(merged.values()).sort((a, b) => a.hop_count - b.hop_count);
}
