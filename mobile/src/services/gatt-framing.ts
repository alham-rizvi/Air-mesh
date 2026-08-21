/**
 * BLE ATT can begin at an MTU of 23 bytes, leaving 20 bytes for a GATT
 * characteristic value. Use that universally safe ceiling rather than claiming
 * a negotiated large MTU that has not been confirmed on the paired phone.
 */
export const MAX_GATT_ATTRIBUTE_BYTES = 20;
const MAGIC = 0xa7;
const VERSION = 1;
const HEADER_BYTES = 6;
const FRAME_PAYLOAD_BYTES = MAX_GATT_ATTRIBUTE_BYTES - HEADER_BYTES;
const ASSEMBLY_TTL_MS = 30_000;

let nextMessageId = Math.floor(Math.random() * 0xffff);

type PartialFrame = { createdAt: number; fragmentCount: number; fragments: Map<number, Uint8Array> };

function concatenate(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const joined = new Uint8Array(length);
  let cursor = 0;
  parts.forEach((part) => { joined.set(part, cursor); cursor += part.length; });
  return joined;
}

/** Splits one mesh frame into ordered, BLE-ATT-safe characteristic values. */
export function fragmentGattFrame(payload: Uint8Array, messageId = (nextMessageId = (nextMessageId + 1) & 0xffff)): Uint8Array[] {
  const fragmentCount = Math.max(1, Math.ceil(payload.length / FRAME_PAYLOAD_BYTES));
  if (fragmentCount > 0xff) throw new Error('Air-Mesh frame exceeds the supported BLE GATT fragment count.');
  return Array.from({ length: fragmentCount }, (_, index) => {
    const body = payload.slice(index * FRAME_PAYLOAD_BYTES, (index + 1) * FRAME_PAYLOAD_BYTES);
    const fragment = new Uint8Array(HEADER_BYTES + body.length);
    fragment.set([MAGIC, VERSION, (messageId >> 8) & 0xff, messageId & 0xff, index, fragmentCount]);
    fragment.set(body, HEADER_BYTES);
    return fragment;
  });
}

/** Reassembles ordered or out-of-order GATT values independently for each remote device. */
export class GattFrameAssembler {
  private readonly partials = new Map<string, PartialFrame>();

  accept(deviceId: string, value: Uint8Array): Uint8Array | null {
    this.cleanup();
    if (value.length < HEADER_BYTES || value[0] !== MAGIC || value[1] !== VERSION) return value;
    const messageId = (value[2] << 8) | value[3];
    const index = value[4];
    const fragmentCount = value[5];
    if (fragmentCount === 0 || index >= fragmentCount) return null;
    const key = `${deviceId}:${messageId}`;
    const existing = this.partials.get(key);
    const partial = existing?.fragmentCount === fragmentCount
      ? existing
      : { createdAt: Date.now(), fragmentCount, fragments: new Map<number, Uint8Array>() };
    partial.fragments.set(index, value.slice(HEADER_BYTES));
    this.partials.set(key, partial);
    if (partial.fragments.size !== fragmentCount) return null;
    const parts: Uint8Array[] = [];
    for (let position = 0; position < fragmentCount; position += 1) {
      const part = partial.fragments.get(position);
      if (!part) return null;
      parts.push(part);
    }
    this.partials.delete(key);
    return concatenate(parts);
  }

  private cleanup(nowMs = Date.now()): void {
    for (const [key, partial] of this.partials) {
      if (nowMs - partial.createdAt > ASSEMBLY_TTL_MS) this.partials.delete(key);
    }
  }
}
