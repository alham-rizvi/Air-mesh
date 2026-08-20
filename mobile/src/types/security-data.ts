export type ContentType = 'text' | 'voice' | 'file' | 'ack';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ChatType = 'direct' | 'group' | 'broadcast';
export type ReportSyncStatus = 'local' | 'synced_to_courier' | 'synced_to_base';
export type ReportSeverity = 'low' | 'medium' | 'high';

export interface RescueLocation { latitude: number; longitude: number; accuracy_m: number | null; captured_at: string; source: 'device'; }

export interface DeviceRecord { id: string; name: string; role: string; public_key: string; created_at: string; }
export interface Contact { id: string; device_id: string; display_name: string; last_seen: string; public_key: string; shared_secret?: string; created_at: string; }
export interface Message { id: string; chat_id: string; sender_id: string; receiver_id?: string; group_id?: string; content_type: ContentType; content?: string; file_path?: string; timestamp: string; status: MessageStatus; ttl: number; message_id_for_dedup: string; }
export interface Chat { id: string; type: ChatType; name: string; member_ids: string[]; created_at: string; }
export interface Report { id: string; shelter_id: string; timestamp: string; people_count: number; needs: string[]; notes: string; severity: ReportSeverity; status: 'active' | 'resolved'; sync_status: ReportSyncStatus; origin_device_id: string; location?: RescueLocation; }
export interface AuditLog { id: string; device_id: string; timestamp: string; action: string; details: Record<string, unknown>; }
export interface RoutingEntry { device_id: string; next_hop_id: string; hop_count: number; updated_at: string; }
export interface FileMetadata { id: string; message_id: string; local_path: string; size: number; checksum: string; }
export interface EncryptedData { ciphertext: string; iv: string; tag: string; }
export interface KeyPair { publicKey: string; privateKey: string; algorithm: 'ed25519' | 'x25519'; }

export interface DatabaseService {
  initialize(): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  getMessages(chatId: string): Promise<Message[]>;
  saveReport(report: Report): Promise<void>;
  getReports(filter?: Partial<Pick<Report, 'status' | 'sync_status' | 'shelter_id'>>): Promise<Report[]>;
  updateReportSyncStatus(ids: string[], status: ReportSyncStatus): Promise<void>;
  saveAuditLog(log: AuditLog): Promise<void>;
  getAuditLogs(filter?: string): Promise<AuditLog[]>;
  updateRoutingTable(entries: RoutingEntry[]): Promise<void>;
  getRoutingTable(): Promise<RoutingEntry[]>;
  saveFile(file: FileMetadata): Promise<void>;
  getFile(messageId: string): Promise<FileMetadata | null>;
  saveContact(contact: Contact): Promise<void>;
  getContact(contactId: string): Promise<Contact | null>;
  listContacts(): Promise<Contact[]>;
  saveChat(chat: Chat): Promise<void>;
  listChats(): Promise<Chat[]>;
}
