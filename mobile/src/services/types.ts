export type DeviceRole = 'user' | 'shelter' | 'courier' | 'base';
export type ContentType = 'text' | 'voice' | 'file' | 'ack';
export type ReportSyncStatus = 'local' | 'synced_to_courier' | 'synced_to_base';

export interface Device {
  id: string;
  name: string;
  role: DeviceRole;
  rssi: number;
  distance_estimate?: string;
}

export interface DeviceInfo {
  device_id: string;
  display_name: string;
  role: DeviceRole;
  public_key: string;
  capabilities: string[];
}

export interface EncryptedMessage {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content_type: ContentType;
  content: string;
  file_path?: string;
  timestamp: string;
  ttl: number;
  sequence?: number;
  total?: number;
}

export interface RoutingEntry {
  destination_device_id: string;
  next_hop_device_id: string;
  hop_count: number;
  updated_at: string;
}

export interface Report {
  id: string;
  shelter_id: string;
  timestamp: string;
  people_count: number;
  needs: string[];
  notes: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
  sync_status: ReportSyncStatus;
  origin_device_id: string;
}

export interface AuditLog {
  id: string;
  event: string;
  device_id: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface MeshStatus {
  relay_count: number;
  estimated_range_m: number;
  connected_devices: number;
  transport: 'unavailable' | 'mock' | 'ble' | 'wifi-direct';
}

export interface MeshTransport {
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScan(): Promise<Device[]>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  send(deviceId: string, payload: Uint8Array): Promise<boolean>;
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void;
}

export interface MeshServiceApi {
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScan(): Promise<Device[]>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  sendEncryptedMessage(deviceId: string, payload: EncryptedMessage): Promise<boolean>;
  onMessageReceived(callback: (message: EncryptedMessage) => void): () => void;
  broadcastMessage(payload: EncryptedMessage): Promise<boolean>;
  syncReportsFromShelter(deviceId: string): Promise<Report[]>;
  syncReportsToBase(reports: Report[], baseUrl?: string): Promise<boolean>;
  getRoutingTable(): Promise<RoutingEntry[]>;
  getMeshStatus(): Promise<MeshStatus>;
}
