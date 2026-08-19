# Air-Mesh Integrated Architecture

Air-Mesh is an offline-first monorepo with a React Native/Expo mobile client, a Rust base-camp server, and shared operational documentation.

```text
+---------------------------+       BLE / Wi-Fi Direct       +---------------------------+
| Mobile device A           | <----------------------------> | Mobile device B           |
| UI + Zustand              |                               | UI + local stores        |
| Integration facade        |                               | Mesh transport           |
| SQLite / mock DB          |                               | Crypto + audit           |
+-------------+-------------+                               +-------------+-------------+
              |                                                           |
              | encrypted message envelope / routing metadata             |
              v                                                           v
       +------+------------------+                            +-----------+--------------+
       | MeshService + protocol  |                            | MeshService + protocol  |
       | chunking / TTL / dedup  |                            | store-and-forward      |
       +------------+------------+                            +-----------+--------------+
                    |
                    | courier Wi-Fi / local HTTP fallback
                    v
       +------------+------------+
       | base-laptop Rust/Axum  |
       | SQLite + mock/Ollama AI |
       | /sync /insights /audit  |
       +-------------------------+
```

## Message flow

The integration facade receives plaintext only at the UI boundary, resolves a paired contact, derives or loads the local shared secret, and calls `encryptMessageForContact`. It stores the encrypted envelope in the local message table, emits it through `MeshService`, and writes a `message_sent` or `message_queued` audit event. A receiver parses the envelope, calls `decryptMessageFromContact`, persists the encrypted envelope, and emits `message_received`. The mesh layer owns chunking, deduplication, TTL handling, and routing; the UI does not manipulate raw transport frames.

## Report flow

A shelter report is persisted locally with `sync_status = local` and a `report_created` audit event. Courier sync reads local reports through the database adapter, transfers them over the mesh when a shelter is nearby, and marks them `synced_to_courier`. At base camp, the courier adapter sends the reports to the Rust `/sync` endpoint; successful responses update the records to `synced_to_base` and write a base-sync audit event.

## Security and storage

The native mobile build uses `expo-sqlite` and a native `react-native-quick-crypto` development-build boundary. Web/Vitest use compatible in-memory adapters only. Private keys are intentionally not written into ordinary SQLite by the current foundation; production hardening should store them in platform secure storage. Audit metadata must never contain plaintext message bodies or private keys.

## Native boundary

Expo Go and web use safe unavailable/mock transport behavior. Real BLE discovery, connection, advertising, and peripheral behavior require an Android/iOS development build with the native BLE module installed and platform permissions granted. The generated Android project is committed under `android/` and the Rust server is under `base-laptop/`.
