import type { Device, ExternalRadioStatus, MeshTransport } from './types';

/**
 * Adapter contract for a separately licensed, physical long-range radio accessory.
 * Air-Mesh intentionally provides no proprietary radio implementation or emulated peer data.
 */
export interface ExternalRadioClient {
  scan?(): Promise<Device[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  send(deviceId: string, payload: Uint8Array): Promise<boolean>;
  onPacket(callback: (deviceId: string, payload: Uint8Array) => void): () => void;
  getStatus(): Promise<ExternalRadioStatus>;
}

/**
 * Makes an approved hardware SDK look like an Air-Mesh transport.
 * A partner bridge must be registered in a native build before this transport can be used.
 */
export class ExternalRadioTransport implements MeshTransport {
  readonly kind = 'external-radio' as const;

  constructor(private readonly client: ExternalRadioClient) {}

  async startAdvertising(): Promise<void> {
    throw new Error('External-radio advertising is controlled by the paired hardware adapter.');
  }

  async stopAdvertising(): Promise<void> {}
  async startScan(): Promise<Device[]> { return this.client.scan ? this.client.scan() : []; }
  async stopScan(): Promise<void> {}
  async connect(deviceId: string): Promise<void> { await this.client.connect(deviceId); }
  async disconnect(deviceId: string): Promise<void> { await this.client.disconnect(deviceId); }
  async send(deviceId: string, payload: Uint8Array): Promise<boolean> { return this.client.send(deviceId, payload); }
  onData(callback: (deviceId: string, payload: Uint8Array) => void): () => void { return this.client.onPacket(callback); }
  async getExternalRadioStatus(): Promise<ExternalRadioStatus> { return this.client.getStatus(); }
}
