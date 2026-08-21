# Air-Mesh Implementation Checklist Record

**Project:** Air-Mesh offline-first peer-to-peer messaging and rescue coordination

**Repository:** [alham-rizvi/Air-mesh](https://github.com/alham-rizvi/Air-mesh)

**Current verified source commit:** [`a4362b3`](https://github.com/alham-rizvi/Air-mesh/commit/a4362b32e0cbaf94aeb21b47604c01d47f33fcf6)

**Current managed Android release:** [v1.0.1](https://github.com/alham-rizvi/Air-mesh/releases/tag/v1.0.1)

**Record date:** 20 August 2026

---

## 1. Purpose and Scope

This document is the detailed implementation record for the checked items in `todo.md`. It explains what was built, where the implementation lives, how it was verified, and which statements are intentionally **not** made because they require physical Android hardware or a separately licensed radio accessory.

> **Truthfulness rule.** Air-Mesh does not invent live peers, network coverage, radio range, delivery receipts, or Base Camp activity. Empty states remain empty until native hardware, user permission, or a real local backend produces an event.

The work covers the mobile application, generated native Android project, BLE/P2P transport boundaries, local database and cryptography interfaces, Rust Base Camp backend, emergency workflows, documentation, visual assets, tests, GitHub synchronization, and managed APK releases.

| Area | Completion state | Core evidence |
|---|---|---|
| Mobile interface and offline identity | Implemented | `app/(tabs)/index.tsx`, `lib/air-mesh-store.ts` |
| Android native setup | Implemented | `android/`, `AndroidManifest.xml`, release workflow |
| BLE/P2P boundaries | Implemented; hardware acceptance pending | `mobile/src/services/ble-transport.ts`, `mesh-service.ts` |
| Local security and data | Implemented with native/mock boundaries | `mobile/src/services/`, `mobile/src/types/security-data.ts` |
| Rust Base Camp | Implemented and smoke-tested | `base-laptop/src/main.rs` |
| Automated validation | Passing | `pnpm verify:all`, Vitest, Cargo checks |
| Current Android release | Published | v1.0.1 APK, 92,701,782 bytes |

---

## 2. Product, Branding, and Mobile Design

### 2.1 Brand and design system

The project includes the Air-Mesh brand palette, triangle logo configuration, a portrait-first mobile design plan, and reusable UI primitives. The runtime theme system supports a dark default, an explicit light override, system preference selection, and user-selectable Air-Mesh accent colors. The implementation is based on `theme.config.js`, `lib/theme-provider.tsx`, `lib/_core/theme.ts`, and the state in `lib/air-mesh-store.ts`.

Reusable UI building blocks include Button, Card, Input, Avatar, status treatment, message bubbles, progress views, bottom sheets, empty states, and a range indicator. The main app uses four tabs—**Home, Messages, Rescue, and Settings**—with safe-area handling, haptic-capable navigation, and mobile-friendly spacing.

| Checklist group | Implemented behavior |
|---|---|
| Branding and themes | Dark, light, system, and constrained accent-color themes; status bar and app chrome use the active palette. |
| Navigation | Four persistent tabs plus routed detail screens for chats, discovery, contacts, reports, profile, audit, FAQ, and about. |
| Visual polish | Consistent cards, hierarchy, loading/empty/error feedback, dark/light treatment, and accessibility labels on key actions. |
| Mobile orientation | Portrait application configuration and one-handed action placement. |

### 2.2 Web-sourced, non-AI visual assets

Air-Mesh includes non-AI photographs selected from Pexels and recorded in `docs/web-assets.md`. They are bundled locally for offline use, optimized below the checkpoint media threshold, and presented as **decorative** content. They do not represent a specific user, active device, live connection, coverage area, or real incident.

The local-identity setup includes a preparedness image; Home includes a visual card explicitly labeled as not being a live coverage map; Profile includes a field-backpack image; and Settings includes a vintage-radio image. Automated asset tests ensure the files, attribution record, and checkpoint-safe size constraints remain present.

---

## 3. Frontend Workflows and UX

### 3.1 Offline-first identity and account lifecycle

Air-Mesh supports creation of a local display name without email, password, server account, or internet access. The identity is persisted in `AsyncStorage`, receives a locally generated device identifier, and creates a local audit event. Logout asks for confirmation, removes the local account and in-memory UI records, retains theme preference and audit history, and returns the user to setup.

The onboarding, Settings, and FAQ copy explicitly describe that identity and local data remain on the device. No seeded contacts, chats, rescue reports, or active peers are inserted as fake live data.

### 3.2 Home, Messages, Contacts, and Groups

The Home dashboard shows local summary counts, mesh reachability state, local activity, SOS entry, and a decorative preparedness card. It does not present fabricated peer counts or measured radio range. Messages provide local conversations, search, unread handling, relay-aware status text, direct-chat routes, a safe missing-chat fallback, and truthful attachment/voice guidance.

The New Group flow supports contact multi-select. Add Contact supports QR/public-key identity display and manual entry. Contacts route into direct local conversations, and nearby-device discovery is a separate flow rather than an assumed live state.

### 3.3 Rescue and courier workflows

The Rescue area includes Shelter Mode, Courier Mode, report creation, report filtering, local persistence, SOS broadcast seams, and courier synchronization status. Shelter reports carry people count, needs, severity, timestamp, and local/synced state. On-demand rescue location capture validates coordinate bounds and attaches a snapshot only when the user explicitly requests it; location is not silently gathered for BLE discovery.

Courier sync has a BLE-first conceptual boundary and a local HTTP fallback path for Base Camp synchronization. A local action can queue and audit work even when no courier/base peer exists.

### 3.4 Settings, Profile, Audit, FAQ, and About

Settings includes local identity route access, role selection, nearby-permission recheck, connectivity switches, theme/accent selection, security/key-reset audit feedback, FAQ, audit log, and local logout. Profile exposes local identity, device ID, role/status controls, and public-key QR details. Audit records persisted local events with loading, empty, error, refresh, and filtering states. FAQ explains permissions, offline behavior, incident workflows, logout, and audit verification. About now identifies the current **1.0.1 offline-first Android release** and includes an educational—not live—mesh topology visual.

---

## 4. Android Compatibility, Permission, and Discovery Experience

### 4.1 Native Android project and configuration

The generated Android project is committed under `android/`, including the Gradle wrapper, Kotlin entry points, Android resources, and `android/app/src/main/AndroidManifest.xml`. The project uses Java 21 locally for preflight and Gradle 8.14.3 tooling. Managed release builds use a GitHub Actions environment with Android SDK and Java 17 as defined by `.github/workflows/android-release.yml`.

The Expo configuration declares Android minSdk 24 and includes explicit Android permissions for Bluetooth scan/connect, nearby Wi-Fi, fine location, and notifications. Native modules include the Expo/React Native dependencies needed by local storage, asset handling, crypto boundaries, location flow, and BLE development builds.

| Permission or capability | Implementation and rationale |
|---|---|
| `BLUETOOTH_SCAN` | Requested on supported Android 12+ devices only after the app explains that it scans for nearby Air-Mesh devices. |
| `BLUETOOTH_CONNECT` | Requested with scan access on Android 12+ for a user-selected nearby peer connection. |
| `ACCESS_FINE_LOCATION` | Used only for legacy Android BLE discovery where Android requires it; the in-app rationale states it is not used to collect GPS location for discovery. |
| `NEARBY_WIFI_DEVICES` | Declared for future nearby transport capabilities; it does not fabricate a Wi-Fi Direct implementation. |
| Location for SOS | Requested on demand through `expo-location`; current coordinates are attached only to an SOS or report explicitly sent by the user. |
| Notifications and microphone | Declared/configured for supported future notification and voice workflows, with no fake active microphone state. |

### 4.2 Startup readiness gate

The root layout uses `components/android-startup-gate.tsx` before ordinary app interaction on Android. The gate checks the platform and Android API boundary using `mobile/src/services/android-readiness.ts`.

* Android API **24 or later** is considered compatible with the Air-Mesh native BLE boundary.
* Unsupported Android versions receive a safe **local-only mode** rather than a misleading discovery experience.
* Compatible Android devices see a human-readable reason for nearby-device access before the OS permission dialog appears.
* The user can choose **Continue with local-only mode** and revisit the decision from Settings later.
* Web does not access Android permission constants. This platform guard was added after preview testing found that `PermissionsAndroid.PERMISSIONS` was undefined on web.

### 4.3 Bounded scan progress and clear completion feedback

The prior behavior—a BLE scan closing after several seconds—was correct at the transport layer but insufficiently explained in the UI. The updated Discovery screen displays a spinner, countdown, progress bar, scan duration explanation, explicit user-stop outcome, and clear final result. This is built around one shared constant, `BOUNDED_BLE_SCAN_WINDOW_MS = 4,500`, used by the BLE transport and countdown helper.

> **Why scanning stops:** Air-Mesh deliberately uses a bounded approximately five-second BLE scan window. It stops the active scan afterward rather than leaving the radio scanning in the background. The result is displayed as either real discovered Air-Mesh BLE devices or an honest empty result.

The screen now shows Android readiness/permission state before scan, refuses to start discovery when the device is unsupported or permission is absent, provides a visible enable-permission action, and never inserts sample peers. Discovered devices are sorted by actual RSSI and display actual role/RSSI/distance labels derived from scan output.

---

## 5. P2P, Mesh, Protocol, and External Radio Boundaries

### 5.1 BLE transport implementation

`mobile/src/services/ble-transport.ts` contains the `BlePlxTransport` central-client boundary. It:

1. Starts service-filtered scans for the Air-Mesh service UUID.
2. Accumulates actual discovered peripherals over the bounded window.
3. Deduplicates devices by native device ID while retaining latest RSSI/name data.
4. Stops the native scan on timeout, explicit stop, or scan error.
5. Connects and discovers GATT services/characteristics.
6. Monitors the inbox characteristic and passes incoming bytes into the MeshService callback.
7. Writes encoded frames to the outbox characteristic.
8. Removes subscriptions and cancels connections during disconnect cleanup.

The current `react-native-ble-plx` implementation is central-only. It **does not** claim that a phone advertises as a BLE peripheral or hosts a complete GATT server. This is an intentional release gate, not a hidden limitation.

### 5.2 MeshService and routing behavior

`MeshService` owns transport injection, scan output, peer state, connection/disconnection, encrypted frame transmission, retry logic, broadcast, P2P/mesh/broadcast modes, routing state, and incoming-frame delivery.

Peer lifecycle states are `discovered`, `connecting`, `connected`, `disconnected`, and `failed`. Transmission modes are:

| Mode | Behavior |
|---|---|
| `p2p` | Sends to the selected peer ID. |
| `mesh` | Attempts direct delivery, then attempts connected relay peers. |
| `broadcast` | Sends to all connected peers and uses receiver `*`. |

The mesh protocol includes 512-byte chunking, reassembly, deduplication, TTL decrementing, routing-table merging, forwarding decision helpers, file chunking, expiry cleanup, malformed-frame handling, and retry behavior. An inbound P2P callback test now verifies that an encrypted frame sent through a connected loopback transport reaches the registered `onMessageReceived` handler.

### 5.3 Runtime transport selection and honest fallbacks

`runtime-transport.ts` dynamically injects `react-native-ble-plx` on Android native runtime and records `mesh_transport_ready`, `mesh_transport_unavailable`, and startup audit events. Web and unsupported contexts receive `UnavailableMeshTransport`, which returns no invented peers and no false message-delivery result.

### 5.4 Bridgefy and goTenna-inspired boundaries

Bridgefy was assessed as architecture inspiration only. Its licensing terms and developer-agreement restrictions mean the SDK is **not bundled**. Air-Mesh instead owns its own mode, peer-state, scan, protocol, crypto, database, and audit interfaces.

goTenna-inspired requirements are handled through a vendor-neutral external-radio adapter boundary. The application can surface external-radio connection state and measured range only when an approved native hardware adapter reports it. It does not claim a proprietary band, 6.5 km range, or phone-only long-range radio capability without that hardware.

---

## 6. Local Data, Security, Identity, and Audit

### 6.1 Local database

The database layer uses native SQLite on Android and an in-memory mock in web/Vitest contexts. It includes schema initialization, migrations, CRUD operations, indexes, message/report persistence, routing state, and audit data. The platform split makes deterministic tests possible without pretending the browser has Android SQLite.

### 6.2 Security boundaries

Air-Mesh defines AES-256-GCM and X25519/ECDH interfaces via `react-native-quick-crypto` on supported native runtime with safe mock/Web Crypto behavior where native functionality is unavailable. Local contact pairing and public-key identity helpers establish the boundary for trusted identity exchange. The code does not represent mock crypto as production hardware-backed secure storage.

### 6.3 Audit and integration seams

Audit logging records local app start, identity creation/removal, message persistence/queueing, report creation, SOS activity, permission/transport status, key-reset feedback, and other meaningful events. Direct-message attempts pass through encrypted persistence and audit seams. Shelter reports persist via the report service; SOS broadcasts use the integration service boundary.

---

## 7. Rust Base Camp Backend

The Rust backend resides in `base-laptop/` and uses Axum, Tokio, Serde, and SQLite. It supports a locally runnable Base Camp model intended for courier-to-laptop synchronization. It is not a hosted cloud dependency and can run without internet.

| Endpoint | Implemented behavior |
|---|---|
| `GET /health` | Returns service readiness, mock-AI mode, local HTTP transport, and sync path. |
| `POST /sync` | Accepts reports/audit-log payloads, persists recognized items, and reports received count. |
| `GET /reports` | Returns stored reports; an empty JSON array is correct for a fresh database. |
| `GET /insights` | Returns stored or mock-AI/Ollama-generated prioritization insights. |
| `GET /audit` | Returns persisted local audit records. |

The backend includes report/audit/prioritized-action models, SQLite schema/upserts/retrieval, latest-insights storage, static dashboard hosting with SPA fallback, a mock-AI fallback, and an optional Ollama integration. Cargo formatting, test, and build checks pass. A live smoke test using an isolated SQLite database and `MOCK_AI=1` returned health `ready`, valid empty data arrays, and `{"received":0}` from an empty sync request.

---

## 8. Documentation and Repository Organization

The repository includes a branded root README, documentation index, Android release guide, development verification plan, testing matrix, Bridgefy compatibility assessment, pasted-architecture gap report, Base Camp readme, database schema documentation, visual asset attribution record, and release/workflow notes.

Documentation separates:

* **Implemented now:** local identity, database, audit, Android project, BLE central boundary, protocol, Base Camp API, SOS/report integration seams, release automation, and UI flows.
* **Adapter boundary:** external long-range radio hardware and vendor-specific transport integration.
* **Physical-device requirement:** two Android devices must discover, connect, and exchange an encrypted message before any claim of real phone-to-phone mesh capability is made.

---

## 9. Verification Evidence

### 9.1 Automated mobile and service tests

The latest `pnpm verify:all` passed with **24 passing tests** and **1 intentionally skipped authentication test**. The suite covers state/reset behavior, BLE bounded scanning, discovery ordering, chunking/reassembly, routing and TTL, peer lifecycle, transmission modes, P2P inbound callback delivery, security/data persistence boundaries, audit/integration flows, external-radio state boundaries, rescue location validation, visual-asset presence/size/attribution, and Android readiness/rationale logic.

| Verification layer | Latest result |
|---|---|
| TypeScript | Passed with `tsc --noEmit` |
| Lint | Passed with `expo lint` |
| Vitest | 24 passed, 1 intentionally skipped |
| Android preflight | Passed; manifest and Gradle wrapper detected |
| Gradle tooling | Gradle 8.14.3 available |
| Rust format/test/build | Passed with Cargo 1.97.1 toolchain |
| Base Camp HTTP smoke | Health, reports, insights, audit, and sync responded successfully |

The sandbox does not contain ADB or a configured Android SDK for direct device installation. That is documented as an environment limitation; the managed GitHub workflow performs the actual Android SDK/Gradle assembly.

### 9.2 Managed Android release evidence

The v1.0.1 workflow completed successfully against the current source commit `a4362b3`. The GitHub release contains the following asset:

| Field | Verified value |
|---|---|
| Release tag | `v1.0.1` |
| Target commit | `a4362b32e0cbaf94aeb21b47604c01d47f33fcf6` |
| APK asset | `app-release.apk` |
| Asset size | 92,701,782 bytes |
| SHA-256 | `eb01ee3d4d87e78a2bd1bd80841650c5a96b26b7ab0476f36a8d681ef38b20d1` |
| Download | [GitHub APK asset](https://github.com/alham-rizvi/Air-mesh/releases/download/v1.0.1/app-release.apk) |

---

## 10. Checklist Items Still Open or Hardware-Dependent

Some old unchecked entries in `todo.md` are historical release follow-ups that were superseded by subsequent release workflows. The current v1.0.1 release has now completed successfully, but the checklist should be normalized in a follow-up maintenance commit to reflect that final status.

The following are **not implementation failures**; they are acceptance tasks that need real equipment or licensed vendor integration:

| Remaining gate | Why it cannot be claimed from sandbox tests |
|---|---|
| Two-device Android BLE discovery | Requires two compatible physical Android devices with Bluetooth enabled and permissions granted. |
| Two-device encrypted message delivery | Requires actual GATT service/characteristic interoperability and radio conditions. The callback path is unit-tested, but hardware transport is not simulated as a real peer phone. |
| BLE advertising/peripheral support | The current `react-native-ble-plx` adapter is central-only. A separate native peripheral/GATT server implementation is required. |
| External long-range radio | Requires a separately licensed vendor adapter and physical radio accessory; Air-Mesh has only the vendor-neutral boundary. |
| Production Ollama prioritization | Mock-AI is fully supported; live Ollama needs an installed/running local model service on the Base Camp computer. |

> **Release interpretation:** v1.0.1 is a verified Android APK containing the implemented Air-Mesh app and native boundaries. It should not be described as physically validated phone-to-phone mesh until the two-device acceptance test completes.

---

## 11. Recommended Physical Acceptance Procedure

1. Install the [v1.0.1 APK](https://github.com/alham-rizvi/Air-mesh/releases/download/v1.0.1/app-release.apk) on two Android 7.0+ devices.
2. On each device, open Air-Mesh and observe the Android readiness gate.
3. Read the nearby-device rationale, enable permission, and ensure Bluetooth is enabled.
4. Create a local identity on both devices.
5. On the first device, open **Messages → Nearby devices → Start scan** and observe the bounded scan UI.
6. Confirm that a real Air-Mesh service is discovered only if a compatible peripheral/GATT implementation is present; do not expect the current central-only app to advertise itself.
7. If a supported peer adapter is available, connect, exchange an encrypted message, inspect the local audit log, and repeat after a disconnect/reconnect.
8. Start the Base Camp server in mock-AI mode, submit a test shelter report through `/sync`, and verify reports/insights/audit responses.

---

## 12. References

[1]: https://github.com/alham-rizvi/Air-mesh "Air-Mesh GitHub repository"

[2]: https://github.com/alham-rizvi/Air-mesh/releases/tag/v1.0.1 "Air-Mesh v1.0.1 release"

[3]: https://github.com/alham-rizvi/Air-mesh/actions/runs/32356227183 "v1.0.1 managed Android release workflow"

[4]: https://github.com/alham-rizvi/Air-mesh/blob/main/docs/bridgefy-compatibility-assessment.md "Bridgefy compatibility assessment"

[5]: https://github.com/alham-rizvi/Air-mesh/blob/main/docs/hardware-radio-location-integration.md "External radio and rescue-location integration documentation"
