export type DeviceRole = 'user' | 'shelter' | 'courier' | 'base';
export type ContentType = 'text' | 'voice' | 'file' | 'ack';
export type ReportSyncStatus = 'local' | 'synced_to_courier' | 'synced_to_base';
export type PeerConnectionState = 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'failed';
export type TransmissionMode = { kind: 'p2p' | 'mesh' | 'broadcast'; receiverId?: string };
export type MeshTransportKind = 'unavailable' | 'mock' | 'ble' | 'wifi-direct' | 'external-radio';
export type PeerLinkStrength = 'excellent' | 'good' | 'fair' | 'weak' | 'unavailable';

/** Signal data from the active local transport. Distance is always an estimate, never a GPS position. */
export interface PeerLinkMetrics {
  transport: MeshTransportKind;
  strength: PeerLinkStrength;
  rssi_dbm: number | null;
  estimated_distance_m: number | null;
  source: 'ble-rssi-uncalibrated' | 'wifi-direct-unavailable' | 'unavailable';
  detail: string;
}
export type ExternalRadioState = 'unconfigured' | 'pairing-required' | 'connected' | 'disconnected' | 'unsupported';

/** Status reported by a physical radio integration. Values are omitted when the adapter cannot measure them. */
export interface ExternalRadioStatus {
  state: ExternalRadioState;
  label: string;
  hardware_required: true;
  radio_family: 'proprietary' | 'lora' | 'other';
  measured_range_m?: number;
}

export interface Device {
  id: string;
  name: string;
  role: DeviceRole;
  rssi: number | null;
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
  /** A measured transport range when supplied by hardware; never a phone-only guess. */
  estimated_range_m: number | null;
  connected_devices: number;
  transport: MeshTransportKind;
  external_radio?: ExternalRadioStatus;
}

export interface MeshTransport {
  readonly kind?: MeshTransportKind;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  startScan(): Promise<Device[]>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  send(deviceId: string, payload: Uint8Array): Promise<boolean>;
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void;
  /** Native peripheral transports report server-side client connections here. */
  onPeerState?(callback: (event: { deviceId: string; state: PeerConnectionState; status?: number }) => void): () => void;
  getExternalRadioStatus?(): Promise<ExternalRadioStatus>;
  getPeerLinkMetrics?(deviceId: string): Promise<PeerLinkMetrics>;
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
  getPeerConnectionState(deviceId: string): PeerConnectionState | 'unknown';
  getPeerLinkMetrics(deviceId: string): Promise<PeerLinkMetrics>;
  sendWithMode(mode: TransmissionMode, payload: EncryptedMessage): Promise<boolean>;
}
