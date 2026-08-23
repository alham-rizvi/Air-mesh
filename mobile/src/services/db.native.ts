import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AuditLog, Chat, Contact, DatabaseService, DeliveryReceiptRecord, DeviceRecord, DisasterAlert, FileMetadata, Message, OutboxEnvelope, RelayQueueEnvelope, Report, RetryHistoryRecord, RoutingEntry } from '../types/security-data';

const USE_MOCK_DB = process.env.EXPO_PUBLIC_USE_MOCK_DB === '1' || Platform.OS === 'web';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, public_key TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, display_name TEXT NOT NULL, last_seen TEXT NOT NULL, public_key TEXT NOT NULL, shared_secret TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, sender_id TEXT NOT NULL, receiver_id TEXT, group_id TEXT, content_type TEXT NOT NULL, content TEXT, file_path TEXT, timestamp TEXT NOT NULL, status TEXT NOT NULL, ttl INTEGER NOT NULL, message_id_for_dedup TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS outbox_envelopes (message_id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, destination_id TEXT NOT NULL, encrypted_payload TEXT NOT NULL, ttl INTEGER NOT NULL, created_at TEXT NOT NULL, last_attempt_at TEXT, attempt_count INTEGER NOT NULL, status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS relay_queue (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, destination_id TEXT NOT NULL, next_hop_id TEXT, opaque_envelope TEXT NOT NULL, ttl INTEGER NOT NULL, created_at TEXT NOT NULL, last_attempt_at TEXT, attempt_count INTEGER NOT NULL, status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS delivery_receipts (message_id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, receipt_payload TEXT NOT NULL, verified_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS retry_history (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, attempted_at TEXT NOT NULL, trigger TEXT NOT NULL, outcome TEXT NOT NULL, reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, member_ids TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, shelter_id TEXT NOT NULL, timestamp TEXT NOT NULL, people_count INTEGER NOT NULL, needs TEXT NOT NULL, notes TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, sync_status TEXT NOT NULL, origin_device_id TEXT NOT NULL, location_latitude REAL, location_longitude REAL, location_accuracy_m REAL, location_captured_at TEXT, location_source TEXT);
CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, type TEXT NOT NULL, severity TEXT NOT NULL, source TEXT NOT NULL, issued_at TEXT NOT NULL, expires_at TEXT, status TEXT NOT NULL, origin_device_id TEXT NOT NULL, acknowledged_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, timestamp TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS routing_table (device_id TEXT PRIMARY KEY, next_hop_id TEXT NOT NULL, hop_count INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, local_path TEXT NOT NULL, size INTEGER NOT NULL, checksum TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_envelopes(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_relay_queue_status_created ON relay_queue(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_retry_history_message_attempted ON retry_history(message_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_sync_status ON reports(sync_status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status_issued ON alerts(status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON contacts(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_timestamp ON audit_logs(action, timestamp DESC);
`;

function uuid(): string { return globalThis.crypto?.randomUUID?.() ?? `am-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function now(): string { return new Date().toISOString(); }

class MemoryDatabase implements DatabaseService {
  private initialized = false;
  private readonly devices = new Map<string, DeviceRecord>();
  private readonly contacts = new Map<string, Contact>();
  private readonly messages = new Map<string, Message>();
  private readonly outbox = new Map<string, OutboxEnvelope>();
  private readonly relayQueue = new Map<string, RelayQueueEnvelope>();
  private readonly receipts = new Map<string, DeliveryReceiptRecord>();
  private readonly retryHistory = new Map<string, RetryHistoryRecord>();
  private readonly chats = new Map<string, Chat>();
  private readonly reports = new Map<string, Report>();
  private readonly alerts = new Map<string, DisasterAlert>();
  private readonly auditLogs = new Map<string, AuditLog>();
  private readonly routing = new Map<string, RoutingEntry>();
  private readonly files = new Map<string, FileMetadata>();
  async initialize(): Promise<void> { this.initialized = true; }
  private ensure(): void { if (!this.initialized) throw new Error('Database is not initialized. Call initialize() first.'); }
  async saveMessage(value: Message): Promise<void> { this.ensure(); this.messages.set(value.id, { ...value }); }
  async getMessages(chatId: string): Promise<Message[]> { this.ensure(); return Array.from(this.messages.values()).filter((value) => value.chat_id === chatId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); }
  async updateMessageStatus(messageId: string, status: Message['status']): Promise<void> { this.ensure(); for (const [id, message] of this.messages) if (message.message_id_for_dedup === messageId) this.messages.set(id, { ...message, status }); }
  async saveOutboxEnvelope(value: OutboxEnvelope): Promise<void> { this.ensure(); this.outbox.set(value.message_id, { ...value }); }
  async getQueuedOutboxEnvelopes(): Promise<OutboxEnvelope[]> { this.ensure(); return Array.from(this.outbox.values()).filter((value) => value.status === 'queued').sort((a, b) => a.created_at.localeCompare(b.created_at)); }
  async updateOutboxEnvelope(messageId: string, update: Pick<OutboxEnvelope, 'status' | 'last_attempt_at' | 'attempt_count'>): Promise<void> { this.ensure(); const current = this.outbox.get(messageId); if (current) this.outbox.set(messageId, { ...current, ...update }); }
  async clearQueuedOutboxEnvelopes(): Promise<number> { this.ensure(); const queued = await this.getQueuedOutboxEnvelopes(); queued.forEach((entry) => this.outbox.delete(entry.message_id)); return queued.length; }
  async saveRelayQueueEnvelope(value: RelayQueueEnvelope): Promise<void> { this.ensure(); this.relayQueue.set(value.id, { ...value }); }
  async getQueuedRelayEnvelopes(): Promise<RelayQueueEnvelope[]> { this.ensure(); return Array.from(this.relayQueue.values()).filter((value) => value.status === 'queued').sort((a, b) => a.created_at.localeCompare(b.created_at)); }
  async updateRelayQueueEnvelope(id: string, update: Pick<RelayQueueEnvelope, 'status' | 'last_attempt_at' | 'attempt_count' | 'next_hop_id'>): Promise<void> { this.ensure(); const current = this.relayQueue.get(id); if (current) this.relayQueue.set(id, { ...current, ...update }); }
  async clearQueuedRelayEnvelopes(): Promise<number> { this.ensure(); const queued = await this.getQueuedRelayEnvelopes(); queued.forEach((entry) => this.relayQueue.delete(entry.id)); return queued.length; }
  async saveDeliveryReceipt(value: DeliveryReceiptRecord): Promise<void> { this.ensure(); this.receipts.set(value.message_id, { ...value }); }
  async saveRetryHistory(value: RetryHistoryRecord): Promise<void> { this.ensure(); this.retryHistory.set(value.id, { ...value }); }
  async getRetryHistory(messageId: string): Promise<RetryHistoryRecord[]> { this.ensure(); return Array.from(this.retryHistory.values()).filter((value) => value.message_id === messageId).sort((a, b) => b.attempted_at.localeCompare(a.attempted_at)); }
  async saveReport(value: Report): Promise<void> { this.ensure(); this.reports.set(value.id, { ...value, needs: [...value.needs] }); }
  async updateReportSyncStatus(ids: string[], status: Report['sync_status']): Promise<void> { this.ensure(); ids.forEach((id) => { const report = this.reports.get(id); if (report) this.reports.set(id, { ...report, sync_status: status }); }); }
  async getReports(filter?: Partial<Pick<Report, 'status' | 'sync_status' | 'shelter_id'>>): Promise<Report[]> { this.ensure(); return Array.from(this.reports.values()).filter((value) => !filter || Object.entries(filter).every(([key, expected]) => value[key as keyof Report] === expected)).map((value) => ({ ...value, needs: [...value.needs] })); }
  async saveAlert(value: DisasterAlert): Promise<void> { this.ensure(); this.alerts.set(value.id, { ...value }); }
  async listAlerts(filter?: Partial<Pick<DisasterAlert, 'status' | 'severity'>>): Promise<DisasterAlert[]> { this.ensure(); return Array.from(this.alerts.values()).filter((value) => !filter || Object.entries(filter).every(([key, expected]) => value[key as keyof DisasterAlert] === expected)).sort((a, b) => b.issued_at.localeCompare(a.issued_at)).map((value) => ({ ...value })); }
  async acknowledgeAlert(alertId: string, acknowledgedAt: string): Promise<void> { this.ensure(); const current = this.alerts.get(alertId); if (current) this.alerts.set(alertId, { ...current, status: 'acknowledged', acknowledged_at: acknowledgedAt }); }
  async saveAuditLog(value: AuditLog): Promise<void> { this.ensure(); this.auditLogs.set(value.id, { ...value, details: { ...value.details } }); }
  async getAuditLogs(filter?: string): Promise<AuditLog[]> { this.ensure(); return Array.from(this.auditLogs.values()).filter((value) => !filter || value.action === filter).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); }
  async updateRoutingTable(entries: RoutingEntry[]): Promise<void> { this.ensure(); entries.forEach((entry) => this.routing.set(entry.device_id, { ...entry })); }
  async getRoutingTable(): Promise<RoutingEntry[]> { this.ensure(); return Array.from(this.routing.values()); }
  async saveFile(value: FileMetadata): Promise<void> { this.ensure(); this.files.set(value.id, { ...value }); }
  async getFile(messageId: string): Promise<FileMetadata | null> { this.ensure(); return Array.from(this.files.values()).find((value) => value.message_id === messageId) ?? null; }
  async saveContact(value: Contact): Promise<void> { this.ensure(); this.contacts.set(value.id, { ...value }); }
  async getContact(contactId: string): Promise<Contact | null> { this.ensure(); return this.contacts.get(contactId) ?? null; }
  async listContacts(): Promise<Contact[]> { this.ensure(); return Array.from(this.contacts.values()); }
  async saveChat(value: Chat): Promise<void> { this.ensure(); this.chats.set(value.id, { ...value, member_ids: [...value.member_ids] }); }
  async listChats(): Promise<Chat[]> { this.ensure(); return Array.from(this.chats.values()); }
}

class SQLiteDatabaseService implements DatabaseService {
  private database: SQLiteDatabase | null = null;
  async initialize(): Promise<void> { if (!this.database) { const { openDatabaseAsync } = await import('expo-sqlite'); this.database = await openDatabaseAsync('airmesh.db'); await this.database.execAsync(SCHEMA); const columns = await this.database.getAllAsync<{ name: string }>('PRAGMA table_info(reports)'); const additions = [{ name: 'location_latitude', sql: 'REAL' }, { name: 'location_longitude', sql: 'REAL' }, { name: 'location_accuracy_m', sql: 'REAL' }, { name: 'location_captured_at', sql: 'TEXT' }, { name: 'location_source', sql: 'TEXT' }]; for (const addition of additions) if (!columns.some((column) => column.name === addition.name)) await this.database.execAsync(`ALTER TABLE reports ADD COLUMN ${addition.name} ${addition.sql}`); } }
  private async db(): Promise<SQLiteDatabase> { await this.initialize(); return this.database as SQLiteDatabase; }
  async saveMessage(value: Message): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO messages (id, chat_id, sender_id, receiver_id, group_id, content_type, content, file_path, timestamp, status, ttl, message_id_for_dedup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.chat_id, value.sender_id, value.receiver_id ?? null, value.group_id ?? null, value.content_type, value.content ?? null, value.file_path ?? null, value.timestamp, value.status, value.ttl, value.message_id_for_dedup); }
  async getMessages(chatId: string): Promise<Message[]> { const db = await this.db(); return db.getAllAsync<Message>('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC', chatId); }
  async updateMessageStatus(messageId: string, status: Message['status']): Promise<void> { const db = await this.db(); await db.runAsync('UPDATE messages SET status = ? WHERE message_id_for_dedup = ?', status, messageId); }
  async saveOutboxEnvelope(value: OutboxEnvelope): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO outbox_envelopes (message_id, chat_id, destination_id, encrypted_payload, ttl, created_at, last_attempt_at, attempt_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', value.message_id, value.chat_id, value.destination_id, value.encrypted_payload, value.ttl, value.created_at, value.last_attempt_at, value.attempt_count, value.status); }
  async getQueuedOutboxEnvelopes(): Promise<OutboxEnvelope[]> { const db = await this.db(); return db.getAllAsync<OutboxEnvelope>("SELECT * FROM outbox_envelopes WHERE status = 'queued' ORDER BY created_at ASC"); }
  async updateOutboxEnvelope(messageId: string, update: Pick<OutboxEnvelope, 'status' | 'last_attempt_at' | 'attempt_count'>): Promise<void> { const db = await this.db(); await db.runAsync('UPDATE outbox_envelopes SET status = ?, last_attempt_at = ?, attempt_count = ? WHERE message_id = ?', update.status, update.last_attempt_at, update.attempt_count, messageId); }
  async clearQueuedOutboxEnvelopes(): Promise<number> { const db = await this.db(); const result = await db.runAsync("DELETE FROM outbox_envelopes WHERE status = 'queued'"); return result.changes; }
  async saveRelayQueueEnvelope(value: RelayQueueEnvelope): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO relay_queue (id, message_id, destination_id, next_hop_id, opaque_envelope, ttl, created_at, last_attempt_at, attempt_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.message_id, value.destination_id, value.next_hop_id, value.opaque_envelope, value.ttl, value.created_at, value.last_attempt_at, value.attempt_count, value.status); }
  async getQueuedRelayEnvelopes(): Promise<RelayQueueEnvelope[]> { const db = await this.db(); return db.getAllAsync<RelayQueueEnvelope>("SELECT * FROM relay_queue WHERE status = 'queued' ORDER BY created_at ASC"); }
  async updateRelayQueueEnvelope(id: string, update: Pick<RelayQueueEnvelope, 'status' | 'last_attempt_at' | 'attempt_count' | 'next_hop_id'>): Promise<void> { const db = await this.db(); await db.runAsync('UPDATE relay_queue SET status = ?, last_attempt_at = ?, attempt_count = ?, next_hop_id = ? WHERE id = ?', update.status, update.last_attempt_at, update.attempt_count, update.next_hop_id, id); }
  async clearQueuedRelayEnvelopes(): Promise<number> { const db = await this.db(); const result = await db.runAsync("DELETE FROM relay_queue WHERE status = 'queued'"); return result.changes; }
  async saveDeliveryReceipt(value: DeliveryReceiptRecord): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO delivery_receipts (message_id, recipient_id, receipt_payload, verified_at) VALUES (?, ?, ?, ?)', value.message_id, value.recipient_id, value.receipt_payload, value.verified_at); }
  async saveRetryHistory(value: RetryHistoryRecord): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO retry_history (id, message_id, attempted_at, trigger, outcome, reason) VALUES (?, ?, ?, ?, ?, ?)', value.id, value.message_id, value.attempted_at, value.trigger, value.outcome, value.reason); }
  async getRetryHistory(messageId: string): Promise<RetryHistoryRecord[]> { const db = await this.db(); return db.getAllAsync<RetryHistoryRecord>('SELECT * FROM retry_history WHERE message_id = ? ORDER BY attempted_at DESC', messageId); }
  async saveReport(value: Report): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO reports (id, shelter_id, timestamp, people_count, needs, notes, severity, status, sync_status, origin_device_id, location_latitude, location_longitude, location_accuracy_m, location_captured_at, location_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.shelter_id, value.timestamp, value.people_count, value.needs.join(','), value.notes, value.severity, value.status, value.sync_status, value.origin_device_id, value.location?.latitude ?? null, value.location?.longitude ?? null, value.location?.accuracy_m ?? null, value.location?.captured_at ?? null, value.location?.source ?? null); }
  async updateReportSyncStatus(ids: string[], status: Report['sync_status']): Promise<void> { if (!ids.length) return; const db = await this.db(); const placeholders = ids.map(() => '?').join(','); await db.runAsync(`UPDATE reports SET sync_status = ? WHERE id IN (${placeholders})`, status, ...ids); }
  async getReports(filter?: Partial<Pick<Report, 'status' | 'sync_status' | 'shelter_id'>>): Promise<Report[]> { const db = await this.db(); const where = Object.keys(filter ?? {}); const values = Object.values(filter ?? {}); const columns = { status: 'status', sync_status: 'sync_status', shelter_id: 'shelter_id' } as const; const clause = where.length ? ` WHERE ${where.map((key) => `${columns[key as keyof typeof columns]} = ?`).join(' AND ')}` : ''; const rows = await db.getAllAsync<Omit<Report, 'needs' | 'location'> & { needs: string; location_latitude: number | null; location_longitude: number | null; location_accuracy_m: number | null; location_captured_at: string | null; location_source: 'device' | null }>(`SELECT * FROM reports${clause} ORDER BY timestamp DESC`, ...values); return rows.map(({ location_latitude, location_longitude, location_accuracy_m, location_captured_at, location_source, ...row }) => ({ ...row, needs: row.needs ? row.needs.split(',').filter(Boolean) : [], ...(location_latitude !== null && location_longitude !== null && location_captured_at && location_source ? { location: { latitude: location_latitude, longitude: location_longitude, accuracy_m: location_accuracy_m, captured_at: location_captured_at, source: location_source } } : {}) })); }
  async saveAlert(value: DisasterAlert): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO alerts (id, title, summary, type, severity, source, issued_at, expires_at, status, origin_device_id, acknowledged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.title, value.summary, value.type, value.severity, value.source, value.issued_at, value.expires_at, value.status, value.origin_device_id, value.acknowledged_at); }
  async listAlerts(filter?: Partial<Pick<DisasterAlert, 'status' | 'severity'>>): Promise<DisasterAlert[]> { const db = await this.db(); const where = Object.keys(filter ?? {}); const values = Object.values(filter ?? {}); const columns = { status: 'status', severity: 'severity' } as const; const clause = where.length ? ` WHERE ${where.map((key) => `${columns[key as keyof typeof columns]} = ?`).join(' AND ')}` : ''; return db.getAllAsync<DisasterAlert>(`SELECT * FROM alerts${clause} ORDER BY issued_at DESC`, ...values); }
  async acknowledgeAlert(alertId: string, acknowledgedAt: string): Promise<void> { const db = await this.db(); await db.runAsync("UPDATE alerts SET status = 'acknowledged', acknowledged_at = ? WHERE id = ?", acknowledgedAt, alertId); }
  async saveAuditLog(value: AuditLog): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO audit_logs (id, device_id, timestamp, action, details) VALUES (?, ?, ?, ?, ?)', value.id, value.device_id, value.timestamp, value.action, JSON.stringify(value.details)); }
  async getAuditLogs(filter?: string): Promise<AuditLog[]> { const db = await this.db(); const rows = filter ? await db.getAllAsync<Omit<AuditLog, 'details'> & { details: string }>('SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC', filter) : await db.getAllAsync<Omit<AuditLog, 'details'> & { details: string }>('SELECT * FROM audit_logs ORDER BY timestamp DESC'); return rows.map((row) => ({ ...row, details: JSON.parse(row.details || '{}') })); }
  async updateRoutingTable(entries: RoutingEntry[]): Promise<void> { const db = await this.db(); await db.withTransactionAsync(async () => { for (const entry of entries) await db.runAsync('INSERT OR REPLACE INTO routing_table (device_id, next_hop_id, hop_count, updated_at) VALUES (?, ?, ?, ?)', entry.device_id, entry.next_hop_id, entry.hop_count, entry.updated_at); }); }
  async getRoutingTable(): Promise<RoutingEntry[]> { const db = await this.db(); return db.getAllAsync<RoutingEntry>('SELECT device_id, next_hop_id, hop_count, updated_at FROM routing_table ORDER BY hop_count ASC'); }
  async saveFile(value: FileMetadata): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO files (id, message_id, local_path, size, checksum) VALUES (?, ?, ?, ?, ?)', value.id, value.message_id, value.local_path, value.size, value.checksum); }
  async getFile(messageId: string): Promise<FileMetadata | null> { const db = await this.db(); return db.getFirstAsync<FileMetadata>('SELECT * FROM files WHERE message_id = ?', messageId); }
  async saveContact(value: Contact): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO contacts (id, device_id, display_name, last_seen, public_key, shared_secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', value.id, value.device_id, value.display_name, value.last_seen, value.public_key, value.shared_secret ?? null, value.created_at); }
  async getContact(contactId: string): Promise<Contact | null> { const db = await this.db(); return db.getFirstAsync<Contact>('SELECT * FROM contacts WHERE id = ?', contactId); }
  async listContacts(): Promise<Contact[]> { const db = await this.db(); return db.getAllAsync<Contact>('SELECT * FROM contacts ORDER BY display_name ASC'); }
  async saveChat(value: Chat): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO chats (id, type, name, member_ids, created_at) VALUES (?, ?, ?, ?, ?)', value.id, value.type, value.name, value.member_ids.join(','), value.created_at); }
  async listChats(): Promise<Chat[]> { const db = await this.db(); const rows = await db.getAllAsync<Omit<Chat, 'member_ids'> & { member_ids: string }>('SELECT * FROM chats ORDER BY created_at DESC'); return rows.map((row) => ({ ...row, member_ids: row.member_ids ? row.member_ids.split(',').filter(Boolean) : [] })); }
}

export const database: DatabaseService = USE_MOCK_DB ? new MemoryDatabase() : new SQLiteDatabaseService();
export { uuid, now, USE_MOCK_DB };
