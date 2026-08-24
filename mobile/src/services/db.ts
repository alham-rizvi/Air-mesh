import type { AuditLog, Chat, Contact, DatabaseService, DeliveryReceiptRecord, DeviceRecord, DisasterAlert, FileMetadata, Message, OutboxEnvelope, RelayQueueEnvelope, Report, RetryHistoryRecord, RoutingEntry } from '../types/security-data';

export const USE_MOCK_DB = true;
export function uuid(): string { return globalThis.crypto?.randomUUID?.() ?? `am-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function now(): string { return new Date().toISOString(); }

export class MemoryDatabase implements DatabaseService {
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
  async getAuditLogs(filter?: string): Promise<AuditLog[]> { this.ensure(); return Array.from(this.auditLogs.values()).filter((value) => !filter || value.action === filter).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((value) => ({ ...value, details: { ...value.details } })); }
  async updateRoutingTable(entries: RoutingEntry[]): Promise<void> { this.ensure(); entries.forEach((entry) => this.routing.set(entry.device_id, { ...entry })); }
  async getRoutingTable(): Promise<RoutingEntry[]> { this.ensure(); return Array.from(this.routing.values()); }
  async saveFile(value: FileMetadata): Promise<void> { this.ensure(); this.files.set(value.id, { ...value }); }
  async getFile(messageId: string): Promise<FileMetadata | null> { this.ensure(); return Array.from(this.files.values()).find((value) => value.message_id === messageId) ?? null; }
  async saveContact(value: Contact): Promise<void> { this.ensure(); this.contacts.set(value.id, { ...value }); }
  async getContact(contactId: string): Promise<Contact | null> { this.ensure(); return this.contacts.get(contactId) ?? null; }
  async listContacts(): Promise<Contact[]> { this.ensure(); return Array.from(this.contacts.values()).map((value) => ({ ...value })); }
  async saveChat(value: Chat): Promise<void> { this.ensure(); this.chats.set(value.id, { ...value, member_ids: [...value.member_ids] }); }
  async listChats(): Promise<Chat[]> { this.ensure(); return Array.from(this.chats.values()).map((value) => ({ ...value, member_ids: [...value.member_ids] })); }
}

export const database: DatabaseService = new MemoryDatabase();
