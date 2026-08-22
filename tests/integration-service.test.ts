import { afterEach, describe, expect, it } from 'vitest';
import { auditService } from '../mobile/src/services/auditService';
import { database } from '../mobile/src/services/db';
import { generateEphemeralKeyPair, pairWithContact } from '../mobile/src/services/cryptoService';
import { broadcastSos, retryQueuedEncryptedEnvelopes, sendEncryptedText, saveLocalReport, persistRoutingTable } from '../mobile/src/services/integration-service';
import { meshService, MockLoopbackTransport, UnavailableMeshTransport } from '../mobile/src/services/mesh-service';

describe('Air-Mesh integration facade', () => {
  afterEach(() => { meshService.setTransport(new UnavailableMeshTransport()); });
  it('encrypts, queues, persists, and audits a message when transport is unavailable', async () => {
    await database.initialize();
    const own = await generateEphemeralKeyPair();
    const peer = await generateEphemeralKeyPair();
    const contact = await pairWithContact('peer-integration', 'Peer', peer.publicKey, own);
    const result = await sendEncryptedText({ chatId: 'chat-integration', contactId: contact.id, receiverId: contact.device_id, senderId: 'local-device', plaintext: 'queued offline message' });
    expect(result.delivered).toBe(false);
    expect(result.accepted).toBe(false);
    expect((await database.getMessages('chat-integration'))[0].content).toContain('ciphertext');
    expect((await database.getMessages('chat-integration'))[0].status).toBe('queued');
    expect((await database.getQueuedOutboxEnvelopes()).some((envelope) => envelope.message_id === result.message.id)).toBe(true);
    expect((await auditService.getLogs('message_queued'))[0].details).toMatchObject({ encrypted: true });
  });

  it('retries a durable encrypted outbox envelope after a nearby transport becomes eligible without calling it recipient delivery', async () => {
    const own = await generateEphemeralKeyPair();
    const peer = await generateEphemeralKeyPair();
    const contact = await pairWithContact('peer-retry', 'Peer retry', peer.publicKey, own);
    const initial = await sendEncryptedText({ chatId: 'chat-retry', contactId: contact.id, receiverId: contact.device_id, senderId: 'local-device', plaintext: 'retry later' });
    const transport = new MockLoopbackTransport();
    meshService.setTransport(transport);
    await meshService.connect(contact.device_id);
    const retried = await retryQueuedEncryptedEnvelopes();
    expect(initial.delivered).toBe(false);
    expect(retried).toMatchObject({ attempted: expect.any(Number), accepted: expect.any(Number) });
    expect((await database.getQueuedOutboxEnvelopes()).some((envelope) => envelope.message_id === initial.message.id)).toBe(false);
  });

  it('persists rescue reports, routing entries, and SOS audit events', async () => {
    await saveLocalReport({ id: 'integration-report', shelter_id: 'shelter', timestamp: new Date().toISOString(), people_count: 12, needs: ['water'], notes: 'integration test', severity: 'high', status: 'active', sync_status: 'local', origin_device_id: 'local-device' });
    await persistRoutingTable([{ destination_device_id: 'peer', next_hop_device_id: 'relay', hop_count: 1, updated_at: new Date().toISOString() }]);
    const sosDelivered = await broadcastSos('local-device', 'Local Operator');
    expect(sosDelivered).toBe(false);
    expect((await database.getReports({ sync_status: 'local' })).some((report) => report.id === 'integration-report')).toBe(true);
    expect((await database.getRoutingTable())[0]).toMatchObject({ device_id: 'peer', next_hop_id: 'relay' });
    expect((await auditService.getLogs('sos_triggered'))[0].details).toMatchObject({ sender_id: 'local-device' });
  });
});
