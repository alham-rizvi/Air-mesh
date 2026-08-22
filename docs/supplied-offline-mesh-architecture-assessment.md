# Assessment of the Supplied Offline Mesh Architecture

## Decision

The supplied architecture is a **useful target model** for Air-Mesh. Its core model—local identity pairing, encrypted envelopes, local persistence, bounded packet framing, deduplication, TTL-limited forwarding, and courier/base-camp store-and-forward—is aligned with the project. However, several sentences describe stronger delivery, range, or confidentiality guarantees than the current source and physical-device evidence can support. Air-Mesh will adopt the compatible mechanics and reject unsupported claims until field evidence exists.

## Implementation map

| Architecture element | Current Air-Mesh evidence | Status | Adoption decision |
|---|---|---|---|
| Local pairing and AES-256-GCM encrypted payloads | `cryptoService.ts`, contact shared secrets, encrypted integration facade | Implemented at the native security boundary | Retain; pairing is required before direct encrypted text. |
| BLE service, GATT characteristics, advertising, notifications | Android `AirMeshGattModule.kt`, central + peripheral transport | Implemented in source; physical validation pending | Retain; use actual GATT framing, not generic BLE claims. |
| Chunking, reassembly, TTL, and deduplication | `protocol.ts`, GATT framing, mesh tests | Implemented deterministically | Retain; add receipt and durable queue behavior. |
| Routing-table merge and next-hop forwarding | `protocol.ts`, `MeshService` | Partial | Add route exchange/persistence lifecycle and durable queued forwarding. |
| Outbox that survives disconnects and retries later | `messages` persistence and `message_queued` audit only | Partial | Implement a durable envelope outbox with retry state; do not call this delivered. |
| Delivery and read acknowledgments | `ack` content type only | Missing | Add explicit receipt envelope handling. Begin with direct-hop delivery receipt; multi-hop receipt propagation requires physical validation. |
| Group E2E encryption and confidential broadcast key | Direct-contact shared secret only | Missing | Do not claim group E2E or confidential broadcasts until recipient-envelope/group-key design is implemented and reviewed. |
| Courier report transport and local Base Camp | local report persistence plus Rust Base Camp sync | Implemented boundary | Retain; still requires real peer transport acceptance. |

## Corrections required before product claims

The supplied text must not be used to claim a **500 m Bluetooth mesh**, fixed BLE range, delivery in under 500 ms, reliable delivery for all moving/offline nodes, or a 200-device capacity. Air-Mesh uses conservative 20-byte GATT attribute framing underneath higher-level 512-byte protocol chunks, because negotiated ATT payload capacity cannot be assumed. A Wi-Fi Direct local socket is preferred where Android supports it; BLE/GATT is the fallback. Neither path has a fixed distance guarantee.

Likewise, a successful native `send` means only that the immediate transport accepted the encrypted frame. It is not a recipient delivery receipt. A message is considered delivered only after a valid receipt envelope is received and recorded. A retained outbox entry is a local retry candidate, not proof that a relay will eventually carry it.

## Next compatible increment

The immediate implementation increment is a durable local encrypted-envelope outbox plus explicit receipt state. The sender saves an envelope before attempting radio transmission, changes it to `sent` only after immediate transport acceptance, and changes it to `delivered` only after a receipt references the original message ID. On a future eligible peer connection, Air-Mesh retries queued envelopes under bounded retry rules. This supports the supplied store-and-forward goal without falsely claiming a background delivery guarantee.

Routing-table exchange, multi-hop receipt propagation, confidential group key management, and authenticated SOS broadcast remain separately gated protocol work. They require deterministic tests plus the existing two-phone physical acceptance procedures before being represented as live mesh capabilities.
