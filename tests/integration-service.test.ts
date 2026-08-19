import { describe, expect, it } from 'vitest';
import { auditService } from '../mobile/src/services/auditService';
import { database } from '../mobile/src/services/db';
import { generateEphemeralKeyPair, pairWithContact } from '../mobile/src/services/cryptoService';
import { broadcastSos, sendEncryptedText, saveLocalReport, persistRoutingTable } from '../mobile/src/services/integration-service';

describe('Air-Mesh integration facade', () => {
  it('encrypts, queues, persists, and audits a message when transport is unavailable', async () => {
    await database.initialize();
    const own = await generateEphemeralKeyPair();
    const peer = await generateEphemeralKeyPair();
    const contact = await pairWithContact('peer-integration', 'Peer', peer.publicKey, own);
    const result = await sendEncryptedText({ chatId: 'chat-integration', contactId: contact.id, receiverId: contact.device_id, senderId: 'local-device', plaintext: 'queued offline message' });
    expect(result.delivered).toBe(false);
    expect((await database.getMessages('chat-integration'))[0].content).toContain('ciphertext');
    expect((await auditService.getLogs('message_queued'))[0].details).toMatchObject({ encrypted: true });
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
