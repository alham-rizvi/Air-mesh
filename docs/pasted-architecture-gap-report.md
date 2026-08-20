# Air-Mesh Pasted-Architecture Gap Report

**Audit date:** 20 August 2026  
**Scope:** Compare `pasted_content_9.txt` with the repository at the current GitHub-main working state.  
**Purpose:** Prevent repeated APK builds from being mistaken for completed native networking.

## Executive conclusion

The project contains a substantial and tested **protocol, data, security-boundary, UI, and Rust base-camp foundation**, but it does **not yet implement the complete native mesh system described in the pasted architecture**. The BLE adapter is now selected at runtime on native platforms, while peripheral advertising and physical device interoperability remain unproven. Consequently, the Nearby Devices screen drives a bounded scan through `react-native-ble-plx` when the native module is available, but a release APK must still be exercised on Android hardware before physical peer discovery or connection can be claimed.

> Building another APK does not make advertising, GATT peripheral mode, background relay, or two-device interoperability complete. The APK is useful for validating the UI and permission flow, but native transport acceptance is a separate gate.

## Capability matrix

| Pasted requirement | Evidence in repository | Status | What is still required |
|---|---|---|---|
| BLE advertising with Air-Mesh service UUID and role/device payload | `mobile/src/services/ble-transport.ts` declares `startAdvertising`, but `BlePlxTransport.startAdvertising()` throws because `react-native-ble-plx` is central-only. | **Missing native implementation** | Add a peripheral/advertiser module or a supported native BLE peripheral library, define the advertisement payload, and test incoming connections. |
| BLE scanning by Air-Mesh service UUID | `BlePlxTransport.startScan()` calls `startDeviceScan([AIR_MESH_SERVICE_UUID], ...)`; `runtime-transport.ts` dynamically creates `BleManager` on native platforms; the scan resolves after a bounded collection window. | **Runtime wired, hardware unverified** | Test the APK on two Android devices and parse role/capability data from advertisements. |
| Scan result device name, role, RSSI, distance, capabilities | `Device` has id/name/role/rssi/distance estimate; the UI shows RSSI and a label. | **Partial** | Parse manufacturer/service data into role, public-key hash, capabilities, and calibrated distance. Current BLE callback hardcodes role `user` and does not populate `distance_estimate`. |
| BLE connection sequence, service discovery, characteristic subscription | `BlePlxTransport.connect()` calls connect, service discovery, and subscribes to `MESSAGE_INBOX`. | **Partial adapter** | Add MTU negotiation, connection parameter handling, characteristic validation, lifecycle events, reconnect/backoff, and a native integration test. |
| GATT service and characteristics | UUID constants exist for device info, routing, outbox, inbox, sync, and file transfer. | **Contract only** | Implement the peripheral-side GATT service and actual read/write/notify handlers. |
| Connection pool and connection states | `MeshService` tracks a `Set` of connected device IDs. | **Minimal partial** | Add typed states such as scanning, connecting, authenticating, encrypted, ready, retrying, and disconnected; expose them to UI and persist connection diagnostics. |
| 512-byte chunking | `protocol.ts` uses `CHUNK_SIZE = 512` and chunk/reassembly tests pass. | **Implemented with different framing** | The pasted format specifies a binary header, encrypted fragment, sender/receiver fields, and CRC32. Current implementation uses JSON envelopes and base64 payloads; align the wire format before claiming interoperability. |
| Chunk reassembly, corruption handling, expiry, deduplication | `ChunkAssembler` validates sequence bounds, expires buffers, rejects duplicates, and tests pass. | **Implemented locally** | Add checksum/CRC verification and malformed-frame tests matching the final wire format. |
| Direct message flow over BLE | `MeshService.sendEncryptedMessage()` chunks and retries through a `MeshTransport`; the chat UI now persists encrypted direct-message attempts and audits queued delivery. | **Partially integrated, hardware unverified** | Exchange acknowledgements, persist delivered/read transitions, and complete two-device tests. |
| Mesh relay and store-and-forward | `shouldForward`, TTL decrement, routing-table merge, and integration seams exist. | **Protocol foundation only** | Exchange routing tables over GATT, maintain route expiry, queue relay envelopes, prevent loops, and verify A→B→C forwarding on three devices. |
| Distance-vector routing | `mergeRoutingTable()` prefers lower-hop routes. | **Partial algorithm helper** | Implement periodic route advertisements, neighbor expiry, split-horizon/loop protection, and connected-peer route updates. |
| Connection state/error machine | Retry behavior exists in `MeshService.sendWithRetry()` and UI has connect/disconnect/error states. | **Partial** | Add radio error mapping, cancellation, timeout, reconnect policy, and native event-driven state tests. |
| Power management/background duty cycling | No background scan, foreground service, scan window, or battery policy is implemented. | **Missing** | Design Android foreground-service/background-task behavior and measure battery impact on real devices before enabling it. |
| Authentication handshake | `cryptoService.ts` provides key-pair/pairing helpers and encryption boundaries. | **Boundary only** | Perform an on-connection challenge/response using device identity keys, verify trust/pairing state, and reject unauthenticated data frames. |
| Encryption at rest/in transit | Local database, audit seams, and AES/X25519 interfaces exist with test fallbacks. | **Partial** | Use a production native crypto provider on Android, securely store long-term keys, and prove the BLE handshake encrypts/authenticates frames. |
| Base Camp Rust server and SQLite | `base-laptop/src/main.rs` and its database/AI modules implement sync, reports, insights, audit, and dashboard endpoints. | **Implemented locally** | Add authentication, LAN discovery/handshake, deployment hardening, and an actual courier-to-base acceptance test. |
| Courier sync via BLE/HTTP | `sync-service.ts` and `MeshService.syncReportsToBase()` provide interfaces and HTTP fallback. | **Partial** | Implement BLE sync-control frames, conflict resolution, acknowledgements, and real courier/base device testing. |
| UI path from Start Conversation to discovery | `Messages` now routes to `discover`; `Discovery` calls `meshService.startScan()` and exposes Connect/Disconnect. | **Implemented UI, native dependency pending** | Validate on an APK with a wired BLE manager and two physical devices. Unsupported web builds intentionally show an honest empty state. |
| Shelter/Courier/Base/Relay explanation | Discovery screen topology cards and README explain the chain. | **Implemented documentation/UI** | Connect each topology role to real transport capabilities and device-role advertisement data. |

## The critical runtime wiring gap

The repository currently exports:

```ts
export const meshService = new MeshService();
```

`MeshService` defaults safely to `new UnavailableMeshTransport()` at module creation. During root startup, `initializeMeshRuntime()` dynamically constructs `BleManager` and injects `BlePlxTransport` on native platforms; web retains the honest unavailable transport. That means `Start conversation → Start scan` has a real native adapter path, but no physical-device proof exists yet.

The scan adapter now collects callbacks for an explicit bounded window before resolving and has deterministic test coverage. It still needs advertisement parsing for role, capabilities, and key hash before the displayed peer data can meet the pasted architecture.

## What the recent APKs prove and do not prove

The APK release workflow proves that the Expo native project, manifest, Gradle configuration, dependency installation, and release packaging can be built remotely. It does not prove BLE advertising, peripheral GATT behavior, native scan results, MTU negotiation, authenticated pairing, relay forwarding, background operation, or courier/base synchronization. Those require a wired native adapter and physical-device acceptance.

## One final release gate

Do not dispatch another release merely to test the architecture. The next release should be cut only after the following gate is satisfied:

1. A real Android `BleManager` is injected into `BlePlxTransport` behind platform-safe construction. **Completed in code; hardware verification remains required.**
2. A scan window returns streamed peers with parsed role, RSSI, and capabilities. **Bounded streaming scan and RSSI are complete; role/capability parsing remains.**
3. Two Android devices can advertise/scan, connect, discover the Air-Mesh GATT service, and exchange an authenticated encrypted message.
4. Three devices can demonstrate one relay hop with TTL decrement and duplicate suppression.
5. A Courier can sync a Shelter report to Base Camp and receive an acknowledgement.
6. Automated tests pass and a physical-device acceptance record is attached to the release.

Until then, the current project should be described as a **tested offline-first application and mesh protocol foundation with a native BLE adapter boundary**, not as a completed peer-to-peer mesh network.
