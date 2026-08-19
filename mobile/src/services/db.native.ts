import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AuditLog, Chat, Contact, DatabaseService, DeviceRecord, FileMetadata, Message, Report, RoutingEntry } from '../types/security-data';

const USE_MOCK_DB = process.env.EXPO_PUBLIC_USE_MOCK_DB === '1' || Platform.OS === 'web';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, public_key TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, display_name TEXT NOT NULL, last_seen TEXT NOT NULL, public_key TEXT NOT NULL, shared_secret TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, sender_id TEXT NOT NULL, receiver_id TEXT, group_id TEXT, content_type TEXT NOT NULL, content TEXT, file_path TEXT, timestamp TEXT NOT NULL, status TEXT NOT NULL, ttl INTEGER NOT NULL, message_id_for_dedup TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, member_ids TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, shelter_id TEXT NOT NULL, timestamp TEXT NOT NULL, people_count INTEGER NOT NULL, needs TEXT NOT NULL, notes TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, sync_status TEXT NOT NULL, origin_device_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, timestamp TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS routing_table (device_id TEXT PRIMARY KEY, next_hop_id TEXT NOT NULL, hop_count INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, local_path TEXT NOT NULL, size INTEGER NOT NULL, checksum TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_sync_status ON reports(sync_status, timestamp DESC);
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
  private readonly chats = new Map<string, Chat>();
  private readonly reports = new Map<string, Report>();
  private readonly auditLogs = new Map<string, AuditLog>();
  private readonly routing = new Map<string, RoutingEntry>();
  private readonly files = new Map<string, FileMetadata>();
  async initialize(): Promise<void> { this.initialized = true; }
  private ensure(): void { if (!this.initialized) throw new Error('Database is not initialized. Call initialize() first.'); }
  async saveMessage(value: Message): Promise<void> { this.ensure(); this.messages.set(value.id, { ...value }); }
  async getMessages(chatId: string): Promise<Message[]> { this.ensure(); return Array.from(this.messages.values()).filter((value) => value.chat_id === chatId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); }
  async saveReport(value: Report): Promise<void> { this.ensure(); this.reports.set(value.id, { ...value, needs: [...value.needs] }); }
  async updateReportSyncStatus(ids: string[], status: Report['sync_status']): Promise<void> { this.ensure(); ids.forEach((id) => { const report = this.reports.get(id); if (report) this.reports.set(id, { ...report, sync_status: status }); }); }
  async getReports(filter?: Partial<Pick<Report, 'status' | 'sync_status' | 'shelter_id'>>): Promise<Report[]> { this.ensure(); return Array.from(this.reports.values()).filter((value) => !filter || Object.entries(filter).every(([key, expected]) => value[key as keyof Report] === expected)).map((value) => ({ ...value, needs: [...value.needs] })); }
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
  async initialize(): Promise<void> { if (!this.database) { const { openDatabaseAsync } = await import('expo-sqlite'); this.database = await openDatabaseAsync('airmesh.db'); await this.database.execAsync(SCHEMA); } }
  private async db(): Promise<SQLiteDatabase> { await this.initialize(); return this.database as SQLiteDatabase; }
  async saveMessage(value: Message): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO messages (id, chat_id, sender_id, receiver_id, group_id, content_type, content, file_path, timestamp, status, ttl, message_id_for_dedup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.chat_id, value.sender_id, value.receiver_id ?? null, value.group_id ?? null, value.content_type, value.content ?? null, value.file_path ?? null, value.timestamp, value.status, value.ttl, value.message_id_for_dedup); }
  async getMessages(chatId: string): Promise<Message[]> { const db = await this.db(); return db.getAllAsync<Message>('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC', chatId); }
  async saveReport(value: Report): Promise<void> { const db = await this.db(); await db.runAsync('INSERT OR REPLACE INTO reports (id, shelter_id, timestamp, people_count, needs, notes, severity, status, sync_status, origin_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', value.id, value.shelter_id, value.timestamp, value.people_count, value.needs.join(','), value.notes, value.severity, value.status, value.sync_status, value.origin_device_id); }
  async updateReportSyncStatus(ids: string[], status: Report['sync_status']): Promise<void> { if (!ids.length) return; const db = await this.db(); const placeholders = ids.map(() => '?').join(','); await db.runAsync(`UPDATE reports SET sync_status = ? WHERE id IN (${placeholders})`, status, ...ids); }
  async getReports(filter?: Partial<Pick<Report, 'status' | 'sync_status' | 'shelter_id'>>): Promise<Report[]> { const db = await this.db(); const where = Object.keys(filter ?? {}); const values = Object.values(filter ?? {}); const columns = { status: 'status', sync_status: 'sync_status', shelter_id: 'shelter_id' } as const; const clause = where.length ? ` WHERE ${where.map((key) => `${columns[key as keyof typeof columns]} = ?`).join(' AND ')}` : ''; const rows = await db.getAllAsync<Omit<Report, 'needs'> & { needs: string }>(`SELECT * FROM reports${clause} ORDER BY timestamp DESC`, ...values); return rows.map((row) => ({ ...row, needs: row.needs ? row.needs.split(',').filter(Boolean) : [] })); }
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
