import { describe, expect, it } from 'vitest';
import { AuthenticatedMeshNode, type RelayEnvelope } from '../mobile/src/services/authenticated-mesh';

describe('authenticated offline mesh simulation', () => {
  it('routes between Alice and Bob through an opaque relay, recovers queued work, suppresses duplicates, and verifies Bob’s receipt without hardware or internet', async () => {
    const alice = new AuthenticatedMeshNode('alice');
    const relay = new AuthenticatedMeshNode('relay');
    const bob = new AuthenticatedMeshNode('bob');
    const aliceRelay = 'alice-relay-link'; const relayBob = 'relay-bob-link'; const aliceBob = 'alice-bob-receipt-key';

    alice.addNeighbor('relay', aliceRelay); relay.addNeighbor('alice', aliceRelay);
    relay.addNeighbor('bob', relayBob); bob.addNeighbor('relay', relayBob);
    alice.addRecipientKey('bob', aliceBob); bob.addRecipientKey('alice', aliceBob);

    expect(await relay.acceptRouteAdvertisement('bob', await bob.createRouteAdvertisement('relay'))).toBe(true);
    expect(await alice.acceptRouteAdvertisement('relay', await relay.createRouteAdvertisement('alice'))).toBe(true);
    expect(await bob.acceptRouteAdvertisement('relay', await relay.createRouteAdvertisement('bob'))).toBe(true);
    expect(alice.getRoutes().find((route) => route.destination === 'bob')).toMatchObject({ nextHop: 'relay', hops: 2 });

    alice.enqueueData('m-recovery', 'bob', 'ciphertext:opaque-for-relay');
    await alice.flush(async () => false);
    expect(alice.getQueue()).toHaveLength(1);
    await alice.flush(async (nextHop, envelope) => { expect(nextHop).toBe('relay'); await relay.receive('alice', envelope); return true; });
    expect(alice.getQueue()).toHaveLength(0);
    expect(relay.getQueue()).toHaveLength(1);
    expect(relay.getQueue()[0].envelope).toMatchObject({ kind: 'data', messageId: 'm-recovery', ciphertext: 'ciphertext:opaque-for-relay' });

    const forwarded: RelayEnvelope = relay.getQueue()[0].envelope;
    await relay.receive('alice', forwarded);
    expect(relay.getEvents().some((event) => event.type === 'duplicate' && event.messageId === 'm-recovery')).toBe(true);
    await relay.flush(async (nextHop, envelope) => { expect(nextHop).toBe('bob'); await bob.receive('relay', envelope); return true; });
    expect(bob.getDeliveredMessageIds()).toContain('m-recovery');
    expect(relay.getDeliveredMessageIds()).toHaveLength(0);

    await bob.flush(async (nextHop, envelope) => { expect(nextHop).toBe('relay'); await relay.receive('bob', envelope); return true; });
    await relay.flush(async (nextHop, envelope) => { expect(nextHop).toBe('alice'); await alice.receive('relay', envelope); return true; });
    expect(alice.getEvents()).toContainEqual(expect.objectContaining({ type: 'delivered', messageId: 'm-recovery', detail: expect.stringContaining('Authenticated receipt verified') }));
  });

  it('rejects a route advertisement whose direct-neighbor authentication tag is invalid', async () => {
    const alice = new AuthenticatedMeshNode('alice'); const relay = new AuthenticatedMeshNode('relay');
    alice.addNeighbor('relay', 'shared'); relay.addNeighbor('alice', 'shared');
    const advertisement = await relay.createRouteAdvertisement('alice');
    await expect(alice.acceptRouteAdvertisement('relay', { ...advertisement, mac: 'invalid' })).resolves.toBe(false);
  });
});
