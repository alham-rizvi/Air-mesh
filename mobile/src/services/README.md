# Air-Mesh Mobile Services

The service layer is transport-agnostic. `MeshService` accepts a `MeshTransport` implementation, so the app can run safely in Expo Go and web with `UnavailableMeshTransport`, use `MockLoopbackTransport` for deterministic tests, or inject a native development-build adapter such as `BlePlxTransport`.

## Native build boundary

Real BLE discovery, connections, notifications, and advertising require a native development build. Expo Go and web intentionally report an unavailable or unsupported transport instead of inventing nearby devices. The app should request nearby permissions only after the user understands why they are needed; denied and unsupported states remain visible in Settings.

## Protocol

The service layer uses the Air-Mesh service UUID `4fafc201-1fb5-459e-8fcc-c5c9c331914b`, five characteristics for device info, routing, message outbox/inbox, and courier sync, and 512-byte payload chunks. `ChunkAssembler` reassembles complete messages, deduplicates by `message_id`, and `decrementTtl` prevents indefinite forwarding. `mergeRoutingTable` applies a lower-hop-count distance-vector update.

## Security boundary

These services do not implement encryption or persistence. The `EncryptedMessage` payload is intentionally passed through the service boundary for the security/data layer to encrypt, authenticate, store, and retrieve. Do not treat the mock transport as a secure channel.

## Courier sync

`CourierSyncService` pulls shelter reports through the mesh service and pushes local reports to the Rust base-camp HTTP endpoint. A successful push marks the reports as `synced_to_base`; failed pushes remain local for retry.

## Voice and files

`file-service.ts` splits files into 512-byte chunks and reassembles complete payloads. `voice-service.ts` uses `expo-audio` permission and audio-mode APIs, matching Expo SDK 54 rather than the deprecated `expo-av` API. Recording UI should use `useAudioRecorder` in a native screen, cap clips at 30 seconds, and pass the resulting file URI into the file service.
