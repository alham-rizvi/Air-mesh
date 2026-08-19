# Air-Mesh Local Security and Data Schema

Air-Mesh stores messages, contacts, reports, routing metadata, files, and audit events locally. The native Android/iOS build uses `expo-sqlite` through `mobile/src/services/db.native.ts`; web, Vitest, and Expo Go development use the same `DatabaseService` interface with `mobile/src/services/db.ts` in-memory storage. This keeps the interface testable without pretending that a web preview has native SQLite.

| Table | Purpose | Important fields |
|---|---|---|
| `devices` | Known local/nearby identities | `id`, `role`, `public_key`, `created_at` |
| `contacts` | Paired peers and derived shared secrets | `device_id`, `public_key`, `shared_secret` |
| `messages` | Encrypted message envelopes and delivery state | `chat_id`, `content_type`, `ttl`, unique deduplication ID |
| `chats` | Direct, group, and broadcast chat metadata | `type`, `member_ids` |
| `reports` | Shelter/courier rescue reports | `severity`, `sync_status`, `origin_device_id` |
| `audit_logs` | Security and workflow events | `action`, `details`, `timestamp` |
| `routing_table` | Lower-hop route candidates | `device_id`, `next_hop_id`, `hop_count` |
| `files` | Local file metadata for transfer | `message_id`, `local_path`, `checksum` |

## Encryption boundary

`cryptoService.ts` provides identity/ephemeral key-pair interfaces, public-key export/import, shared-secret derivation, AES-256-GCM payloads, contact pairing, and contact-based encrypt/decrypt helpers. The native path dynamically loads `react-native-quick-crypto` in a development build. The mock path uses deterministic local-safe behavior for frontend development and tests; it is not a secure transport and must never be used as evidence of production encryption.

The intended production flow is: generate a device identity key pair, exchange public keys through a QR/manual pairing flow, derive a shared secret, encrypt plaintext before it enters the mesh transport, store only encrypted content and metadata in SQLite, and decrypt only for the paired recipient.

## Audit boundary

`auditService.logAction(action, details, deviceId?)` creates a local UUID and ISO8601 timestamp, then writes the event to `audit_logs`. Networking and UI modules should call it for sends, pairing, report creation, permission changes, sync attempts, and key resets. Audit details are JSON-compatible objects and should not include plaintext message bodies or private keys.

## Local-only guarantees

The database service performs no cloud synchronization and makes no network calls. Courier synchronization remains a separate service boundary that may call the local base-camp endpoint only when the networking layer explicitly requests it. Private keys must be stored using a platform secure store in a future hardening pass rather than ordinary SQLite columns.
