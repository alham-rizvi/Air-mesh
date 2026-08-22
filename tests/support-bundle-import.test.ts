import { describe, expect, it } from 'vitest';
import { parseRedactedSupportBundle } from '../mobile/src/services/support-bundle-import';

const validBundle = JSON.stringify({ schema_version: 1, generated_at: '2026-08-22T00:00:00.000Z', privacy: { contains_plaintext: false, contains_ciphertext: false, contains_keys: false, contains_receipt_payloads: false, identifiers: 'partially redacted' }, mesh_status: { transport: 'wifi-direct' }, observed_topology: { nodes: [{ id: 'rela…id', directly_connected: true }], edges: [] }, routes: [], pending_sender_outbox: [], pending_relay_queue: [], retry_history: [] });

describe('support-bundle import parser', () => {
  it('accepts the redacted exported schema and returns a read-only summary', () => {
    expect(parseRedactedSupportBundle(validBundle)).toMatchObject({ transport: 'wifi-direct', connectedPeers: 1, routes: 0 });
  });
  it('rejects malformed, unsupported, and unsafe bundles', () => {
    expect(() => parseRedactedSupportBundle('{bad json')).toThrow('not valid JSON');
    expect(() => parseRedactedSupportBundle(JSON.stringify({ ...JSON.parse(validBundle), untrusted: true }))).toThrow('Unsupported support-bundle field');
    expect(() => parseRedactedSupportBundle(JSON.stringify({ ...JSON.parse(validBundle), privacy: { contains_plaintext: true, contains_ciphertext: false, contains_keys: false, contains_receipt_payloads: false } }))).toThrow('not redacted');
    expect(() => parseRedactedSupportBundle(JSON.stringify({ ...JSON.parse(validBundle), encrypted_payload: 'secret' }))).toThrow('Unsupported support-bundle field');
  });
});
