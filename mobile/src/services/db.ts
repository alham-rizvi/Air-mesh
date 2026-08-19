import type { AuditLog, Chat, Contact, DatabaseService, DeviceRecord, FileMetadata, Message, Report, RoutingEntry } from '../types/security-data';

export const USE_MOCK_DB = true;
export function uuid(): string { return globalThis.crypto?.randomUUID?.() ?? `am-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function now(): string { return new Date().toISOString(); }

export class MemoryDatabase implements DatabaseService {
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

export const database: DatabaseService = new MemoryDatabase();
