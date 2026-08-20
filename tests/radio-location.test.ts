import { describe, expect, it } from 'vitest';
import { ExternalRadioTransport, type ExternalRadioClient } from '../mobile/src/services/external-radio-transport';
import { isValidRescueLocation } from '../mobile/src/services/rescue-location';
import { MeshService } from '../mobile/src/services/mesh-service';

describe('external radio and rescue-location boundaries', () => {
  it('surfaces only status supplied by a physical-radio adapter', async () => {
    const client: ExternalRadioClient = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      send: async () => true,
      onPacket: () => () => undefined,
      getStatus: async () => ({ state: 'connected', label: 'Approved radio accessory', hardware_required: true, radio_family: 'proprietary', measured_range_m: 6400 }),
    };
    const mesh = new MeshService(new ExternalRadioTransport(client));
    const status = await mesh.getMeshStatus();
    expect(status.transport).toBe('external-radio');
    expect(status.estimated_range_m).toBe(6400);
    expect(status.external_radio?.hardware_required).toBe(true);
  });

  it('validates coordinates before they can be attached to an emergency envelope', () => {
    expect(isValidRescueLocation({ latitude: 40.7128, longitude: -74.006, accuracy_m: 12, captured_at: '2026-08-20T00:00:00.000Z', source: 'device' })).toBe(true);
    expect(isValidRescueLocation({ latitude: 100, longitude: 0, accuracy_m: null, captured_at: '2026-08-20T00:00:00.000Z', source: 'device' })).toBe(false);
  });
});
