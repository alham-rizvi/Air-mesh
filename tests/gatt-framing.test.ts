import { describe, expect, it } from 'vitest';

import { fragmentGattFrame, GattFrameAssembler, MAX_GATT_ATTRIBUTE_BYTES } from '../mobile/src/services/gatt-framing';

describe('GATT framing', () => {
  it('keeps every BLE characteristic value within the default ATT payload and reassembles it per peer', () => {
    const message = Uint8Array.from({ length: 100 }, (_, index) => (index * 17) & 0xff);
    const fragments = fragmentGattFrame(message, 42);
    expect(fragments.length).toBe(8);
    expect(fragments.every((fragment) => fragment.length <= MAX_GATT_ATTRIBUTE_BYTES)).toBe(true);

    const assembler = new GattFrameAssembler();
    let reconstructed: Uint8Array | null = null;
    fragments.slice().reverse().forEach((fragment) => { reconstructed = assembler.accept('phone-b', fragment); });
    expect(reconstructed).toEqual(message);
  });
});
