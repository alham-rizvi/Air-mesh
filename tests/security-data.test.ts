import { describe, expect, it } from 'vitest';
import { database } from '../mobile/src/services/db';
import { decrypt, deriveSharedSecret, encrypt, generateEphemeralKeyPair, pairWithContact } from '../mobile/src/services/cryptoService';
import { getLogs, logAction } from '../mobile/src/services/auditService';
import type { Message, Report } from '../mobile/src/types/security-data';

describe('Air-Mesh security and local data foundation', () => {
  it('stores and retrieves messages and reports through the database interface', async () => {
    await database.initialize();
    const message: Message = { id: 'msg-test', chat_id: 'chat-test', sender_id: 'local', receiver_id: 'peer', content_type: 'text', content: 'offline', timestamp: '2026-08-20T00:00:00Z', status: 'sent', ttl: 5, message_id_for_dedup: 'dedup-test' };
    await database.saveMessage(message);
    expect((await database.getMessages('chat-test'))[0]).toMatchObject({ id: 'msg-test', content: 'offline' });
    const report: Report = { id: 'report-test', shelter_id: 'shelter-test', timestamp: '2026-08-20T00:00:00Z', people_count: 4, needs: ['water'], notes: 'offline report', severity: 'high', status: 'active', sync_status: 'local', origin_device_id: 'local' };
    await database.saveReport(report);
    expect(await database.getReports({ sync_status: 'local' })).toEqual([report]);
  });

  it('round-trips encrypted text and stores a paired contact', async () => {
    const own = await generateEphemeralKeyPair();
    const peer = await generateEphemeralKeyPair();
    const secret = await deriveSharedSecret(own.privateKey, peer.publicKey);
    const encrypted = await encrypt('shelter status', secret);
    expect(await decrypt(encrypted, secret)).toBe('shelter status');
    const contact = await pairWithContact('peer-device', 'Peer Device', peer.publicKey, own);
    expect(contact.shared_secret).toMatch(/^[0-9a-f]+$/);
    expect(await database.getContact(contact.id)).toMatchObject({ device_id: 'peer-device', display_name: 'Peer Device' });
  });

  it('writes an audit log with a local ISO timestamp', async () => {
    const log = await logAction('security.test', { result: 'ok' }, 'local-test-device');
    expect(log.device_id).toBe('local-test-device');
    expect(Number.isNaN(Date.parse(log.timestamp))).toBe(false);
    expect((await getLogs('security.test'))[0].action).toBe('security.test');
  });
});
