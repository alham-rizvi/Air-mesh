export type MeshRoute = { destination: string; nextHop: string; hops: number; updatedAt: string };
export type RouteAdvertisement = { kind: 'route-advertisement'; sender: string; routes: Array<{ destination: string; hops: number }>; issuedAt: string; mac: string };
export type DataEnvelope = { kind: 'data'; messageId: string; origin: string; destination: string; ciphertext: string; ttl: number };
export type DeliveryReceipt = { kind: 'delivery-receipt'; messageId: string; origin: string; recipient: string; destination: string; ttl: number; receivedAt: string; mac: string };
export type RelayEnvelope = DataEnvelope | DeliveryReceipt;
export type RelayQueueRecord = { id: string; envelope: RelayEnvelope; nextHop: string | null; createdAt: string; attempts: number };
export type MeshEvent = { type: 'queued' | 'accepted' | 'delivered' | 'duplicate' | 'dropped'; messageId: string; detail: string };

const text = new TextEncoder();
function base64(bytes: Uint8Array): string { let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function canonical(value: unknown): string { return JSON.stringify(value); }

/** HMAC authenticates route control and end-to-end delivery receipt payloads. */
export async function authenticate(sharedSecret: string, payload: unknown): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey('raw', text.encode(sharedSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, text.encode(canonical(payload)))));
}

export async function verifyAuthentication(sharedSecret: string, payload: unknown, mac: string): Promise<boolean> {
  return (await authenticate(sharedSecret, payload)) === mac;
}

export class AuthenticatedMeshNode {
  private readonly neighborKeys = new Map<string, string>();
  private readonly recipientKeys = new Map<string, string>();
  private readonly routes = new Map<string, MeshRoute>();
  private readonly queue: RelayQueueRecord[] = [];
  private readonly seen = new Set<string>();
  private readonly events: MeshEvent[] = [];
  private readonly delivered: string[] = [];

  constructor(readonly id: string) { this.routes.set(id, { destination: id, nextHop: id, hops: 0, updatedAt: new Date().toISOString() }); }

  addNeighbor(id: string, sharedSecret: string): void { this.neighborKeys.set(id, sharedSecret); this.routes.set(id, { destination: id, nextHop: id, hops: 1, updatedAt: new Date().toISOString() }); }
  addRecipientKey(id: string, sharedSecret: string): void { this.recipientKeys.set(id, sharedSecret); }
  getRoutes(): MeshRoute[] { return Array.from(this.routes.values()).sort((a, b) => a.hops - b.hops || a.destination.localeCompare(b.destination)); }
  getQueue(): RelayQueueRecord[] { return this.queue.map((item) => ({ ...item, envelope: { ...item.envelope } })); }
  getEvents(): MeshEvent[] { return [...this.events]; }
  getDeliveredMessageIds(): string[] { return [...this.delivered]; }

  async createRouteAdvertisement(neighbor: string): Promise<RouteAdvertisement> {
    const key = this.neighborKeys.get(neighbor); if (!key) throw new Error(`No paired link key for ${neighbor}.`);
    const unsigned = { kind: 'route-advertisement' as const, sender: this.id, routes: this.getRoutes().filter((route) => route.destination !== neighbor).map((route) => ({ destination: route.destination, hops: route.hops })), issuedAt: new Date().toISOString() };
    return { ...unsigned, mac: await authenticate(key, unsigned) };
  }

  async acceptRouteAdvertisement(from: string, advertisement: RouteAdvertisement): Promise<boolean> {
    const key = this.neighborKeys.get(from); if (!key || advertisement.sender !== from) return false;
    const { mac, ...unsigned } = advertisement;
    if (!(await verifyAuthentication(key, unsigned, mac))) return false;
    for (const advertised of advertisement.routes) {
      if (!advertised.destination || advertised.destination === this.id || advertised.hops < 0 || advertised.hops > 16) continue;
      const candidate: MeshRoute = { destination: advertised.destination, nextHop: from, hops: advertised.hops + 1, updatedAt: new Date().toISOString() };
      const current = this.routes.get(candidate.destination);
      if (!current || candidate.hops < current.hops || current.nextHop === from) this.routes.set(candidate.destination, candidate);
    }
    return true;
  }

  enqueueData(messageId: string, destination: string, ciphertext: string, ttl = 5): void {
    const envelope: DataEnvelope = { kind: 'data', messageId, origin: this.id, destination, ciphertext, ttl };
    this.enqueue(envelope);
  }

  private enqueue(envelope: RelayEnvelope): void {
    if (envelope.ttl <= 0) { this.events.push({ type: 'dropped', messageId: envelope.messageId, detail: 'TTL exhausted before queueing.' }); return; }
    if (this.queue.some((item) => item.envelope.kind === envelope.kind && item.envelope.messageId === envelope.messageId && item.envelope.destination === envelope.destination)) return;
    const route = this.routes.get(envelope.destination);
    this.queue.push({ id: `${envelope.kind}:${envelope.messageId}:${envelope.destination}`, envelope: { ...envelope }, nextHop: route?.nextHop ?? null, createdAt: new Date().toISOString(), attempts: 0 });
    this.events.push({ type: 'queued', messageId: envelope.messageId, detail: route ? `Queued for next hop ${route.nextHop}.` : 'Queued until a route appears.' });
  }

  /** Flushes only records with a known immediate next hop. A failed send remains durably queued. */
  async flush(send: (nextHop: string, envelope: RelayEnvelope) => Promise<boolean>): Promise<number> {
    let accepted = 0;
    for (const record of [...this.queue]) {
      const route = this.routes.get(record.envelope.destination);
      record.nextHop = route?.nextHop ?? null;
      if (!record.nextHop || record.envelope.ttl <= 0) continue;
      record.attempts += 1;
      const forwarded = { ...record.envelope, ttl: record.envelope.ttl - 1 } as RelayEnvelope;
      if (await send(record.nextHop, forwarded)) {
        this.queue.splice(this.queue.indexOf(record), 1);
        accepted += 1;
        this.events.push({ type: 'accepted', messageId: record.envelope.messageId, detail: `Immediate hop ${record.nextHop} accepted ${record.envelope.kind}.` });
      }
    }
    return accepted;
  }

  async receive(from: string, envelope: RelayEnvelope): Promise<void> {
    if (!this.neighborKeys.has(from) || envelope.ttl < 0) return;
    const dedupId = `${envelope.kind}:${envelope.messageId}:${envelope.destination}`;
    if (this.seen.has(dedupId)) { this.events.push({ type: 'duplicate', messageId: envelope.messageId, detail: 'Duplicate envelope suppressed.' }); return; }
    this.seen.add(dedupId);
    if (envelope.kind === 'data' && envelope.destination === this.id) {
      this.delivered.push(envelope.messageId);
      this.events.push({ type: 'delivered', messageId: envelope.messageId, detail: 'Final recipient accepted the opaque encrypted message envelope.' });
      const receipt = await this.createReceipt(envelope);
      if (receipt) this.enqueue(receipt);
      return;
    }
    if (envelope.kind === 'delivery-receipt' && envelope.destination === this.id) {
      const key = this.recipientKeys.get(envelope.recipient);
      if (key && await verifyAuthentication(key, receiptProof(envelope), envelope.mac)) this.events.push({ type: 'delivered', messageId: envelope.messageId, detail: `Authenticated receipt verified from ${envelope.recipient}.` });
      else this.events.push({ type: 'dropped', messageId: envelope.messageId, detail: 'Receipt failed end-to-end authentication.' });
      return;
    }
    this.enqueue(envelope);
  }

  private async createReceipt(message: DataEnvelope): Promise<DeliveryReceipt | null> {
    const key = this.recipientKeys.get(message.origin); if (!key) return null;
    const receipt = { kind: 'delivery-receipt' as const, messageId: message.messageId, origin: message.origin, recipient: this.id, destination: message.origin, ttl: 5, receivedAt: new Date().toISOString() };
    const mac = await authenticate(key, receiptProof(receipt));
    return { ...receipt, mac };
  }
}

function receiptProof(receipt: Pick<DeliveryReceipt, 'kind' | 'messageId' | 'origin' | 'recipient' | 'receivedAt'>) {
  return { kind: receipt.kind, messageId: receipt.messageId, origin: receipt.origin, recipient: receipt.recipient, receivedAt: receipt.receivedAt };
}
