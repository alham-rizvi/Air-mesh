let quickCrypto: any = null;
async function getQuickCrypto(): Promise<any> { if (!quickCrypto) { const module = await import('react-native-quick-crypto'); quickCrypto = module.default ?? module; } return quickCrypto; }
import { database, USE_MOCK_DB, uuid, now } from './db';
import type { Contact, EncryptedData, KeyPair } from '../types/security-data';

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < size; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array { const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(value: string): Uint8Array { return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (part) => parseInt(part, 16)); }
async function sha256(bytes: Uint8Array): Promise<Uint8Array> { const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer); return new Uint8Array(digest); }
function textBytes(value: string): Uint8Array { return new TextEncoder().encode(value); }

export async function generateIdentityKeyPair(): Promise<KeyPair> {
  const quick = USE_MOCK_DB ? null : await getQuickCrypto();
  if (!quick?.generateKeyPairSync) { const key = bytesToBase64(randomBytes(32)); return { publicKey: key, privateKey: key, algorithm: 'ed25519' }; }
  const generated = quick.generateKeyPairSync('ed25519', { publicKeyEncoding: { format: 'der', type: 'spki' }, privateKeyEncoding: { format: 'der', type: 'pkcs8' } });
  return { publicKey: Buffer.from(generated.publicKey).toString('base64'), privateKey: Buffer.from(generated.privateKey).toString('base64'), algorithm: 'ed25519' };
}

export async function generateEphemeralKeyPair(): Promise<KeyPair> {
  const quick = USE_MOCK_DB ? null : await getQuickCrypto();
  if (!quick?.generateKeyPairSync) { const key = bytesToBase64(randomBytes(32)); return { publicKey: key, privateKey: key, algorithm: 'x25519' }; }
  const generated = quick.generateKeyPairSync('x25519', { publicKeyEncoding: { format: 'der', type: 'spki' }, privateKeyEncoding: { format: 'der', type: 'pkcs8' } });
  return { publicKey: Buffer.from(generated.publicKey).toString('base64'), privateKey: Buffer.from(generated.privateKey).toString('base64'), algorithm: 'x25519' };
}

export function exportPublicKey(keyPair: KeyPair): string { return keyPair.publicKey; }
export function importPublicKey(publicKeyBase64: string, algorithm: 'ed25519' | 'x25519' = 'x25519'): KeyPair { return { publicKey: publicKeyBase64, privateKey: '', algorithm }; }

export async function deriveSharedSecret(ownPrivateKey: string, peerPublicKey: string): Promise<Uint8Array> {
  const quick = USE_MOCK_DB ? null : await getQuickCrypto();
  if (quick?.createPrivateKey && quick?.createPublicKey && quick?.diffieHellman) {
    const privateKey = quick.createPrivateKey({ key: Buffer.from(ownPrivateKey, 'base64'), format: 'der', type: 'pkcs8' });
    const publicKey = quick.createPublicKey({ key: Buffer.from(peerPublicKey, 'base64'), format: 'der', type: 'spki' });
    return Uint8Array.from(quick.diffieHellman({ privateKey, publicKey }));
  }
  const ordered = [ownPrivateKey, peerPublicKey].sort().join(':');
  return sha256(textBytes(ordered));
}

export async function encrypt(plaintext: string, sharedSecret: Uint8Array): Promise<EncryptedData> {
  const key = sharedSecret.length === 32 ? sharedSecret : (await sha256(sharedSecret)).slice(0, 32);
  const iv = randomBytes(12);
  const quick = USE_MOCK_DB ? null : await getQuickCrypto();
  if (!quick?.createCipheriv) return { ciphertext: bytesToBase64(textBytes(plaintext)), iv: bytesToBase64(iv), tag: 'mock' };
  const cipher = quick.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: bytesToBase64(iv), tag: cipher.getAuthTag().toString('base64') };
}

export async function decrypt(encryptedData: EncryptedData, sharedSecret: Uint8Array): Promise<string> {
  const key = sharedSecret.length === 32 ? sharedSecret : (await sha256(sharedSecret)).slice(0, 32);
  const quick = USE_MOCK_DB ? null : await getQuickCrypto();
  if (!quick?.createDecipheriv || encryptedData.tag === 'mock') return new TextDecoder().decode(base64ToBytes(encryptedData.ciphertext));
  const decipher = quick.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(base64ToBytes(encryptedData.iv)));
  decipher.setAuthTag(Buffer.from(base64ToBytes(encryptedData.tag)));
  return Buffer.concat([decipher.update(Buffer.from(base64ToBytes(encryptedData.ciphertext))), decipher.final()]).toString('utf8');
}

export async function encryptMessageForContact(contactId: string, plaintext: string): Promise<EncryptedData> {
  const contact = await database.getContact(contactId);
  if (!contact?.shared_secret) throw new Error('No shared secret is stored for this contact. Pair before encrypting.');
  return encrypt(plaintext, hexToBytes(contact.shared_secret));
}

export async function decryptMessageFromContact(contactId: string, encryptedData: EncryptedData): Promise<string> {
  const contact = await database.getContact(contactId);
  if (!contact?.shared_secret) throw new Error('No shared secret is stored for this contact. Pair before decrypting.');
  return decrypt(encryptedData, hexToBytes(contact.shared_secret));
}

export async function pairWithContact(deviceId: string, displayName: string, publicKey: string, ownIdentityKeyPair: KeyPair): Promise<Contact> {
  const sharedSecret = await deriveSharedSecret(ownIdentityKeyPair.privateKey, publicKey);
  const contact: Contact = { id: uuid(), device_id: deviceId, display_name: displayName, last_seen: now(), public_key: publicKey, shared_secret: bytesToHex(sharedSecret), created_at: now() };
  await database.saveContact(contact);
  return contact;
}

export async function getOwnPublicKey(identityKeyPair: KeyPair): Promise<string> { return exportPublicKey(identityKeyPair); }
