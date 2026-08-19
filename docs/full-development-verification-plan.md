# Air-Mesh Full Development, Verification, and Release Plan

## Purpose

This document is the end-to-end execution plan for completing Air-Mesh from the current integrated monorepo through native Android validation, secure peer-to-peer transport, backend operation, physical-device testing, APK release, and final GitHub verification. It is intentionally explicit about what is already verified in automation, what still requires physical Android hardware, and what must not be represented as live functionality until the corresponding transport is implemented.

> **Current verification baseline:** TypeScript compilation, lint, Vitest, Android preflight, Gradle wrapper inspection, Rust formatting, Rust unit tests, and Rust debug build pass locally. The sandbox reports Java 21 and Gradle 8.14.3, but it does not provide `adb` or an Android SDK. The GitHub Actions release job is the supported remote APK build path and remains separately tracked until its final outcome is published.

## Completion standards

The project is complete only when every applicable stage below is either marked **verified**, marked **verified on physical devices**, or documented as an intentional limitation. No UI may claim live peer connectivity, successful delivery, device discovery, or server synchronization unless the underlying native transport has supplied that evidence.

| Status | Meaning |
|---|---|
| Verified | Reproduced by a deterministic local command or automated test. |
| Device verification required | Must be performed on one or more physical Android devices; emulators are insufficient for BLE and Wi-Fi Direct behavior. |
| Release verification required | Must be confirmed by the GitHub Actions or managed release build, including installation and launch of the generated APK. |
| Intentional limitation | The boundary is implemented honestly but the production transport or hardware test is not yet complete. |

## Stage 1 — Repository and project integrity

The repository must remain a single source of truth. The Expo frontend, native Android project, Rust base-camp server, security/data services, tests, documentation, release workflow, and generated configuration must be present on GitHub `main`.

The maintainer should verify the following paths on every release candidate:

| Area | Required paths |
|---|---|
| Expo application | `app/`, `components/`, `hooks/`, `lib/`, `assets/`, `app.config.ts`, `package.json` |
| Native Android | `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/app/airmesh/MainActivity.kt`, `MainApplication.kt`, Gradle wrapper and build files |
| Mesh/security services | `mobile/src/services/`, `mobile/src/types/`, protocol, crypto, database, audit, and integration services |
| Base camp | `base-laptop/Cargo.toml`, `base-laptop/src/`, backend README and fixtures |
| Automated verification | `tests/`, package scripts, Rust tests, and this document |
| Release automation | `.github/workflows/android-release.yml`, `docs/release.md` |

The repository must not commit private debug keystores, local `.env` files, `node_modules`, Gradle caches, Rust `target/`, or sandbox logs. Every source change must be committed and pushed to `main` before a release tag is created.

## Stage 2 — Local account and application foundation

The first launch must allow a user to create a local identity without email, password, or internet access. The display name, generated local device identifier, creation timestamp, and theme preferences must persist locally. Reopening the app must restore the account rather than silently reseeding fake contacts or chats.

The acceptance flow is:

1. Launch the app with cleared local storage.
2. Confirm that the local identity screen appears.
3. Enter a display name and create the account.
4. Choose whether to grant nearby discovery permissions after the rationale is shown.
5. Choose **Not now**, confirm that onboarding completes without a crash, and verify that Settings provides a retry path.
6. Relaunch and verify that the identity is restored locally.
7. Clear app data and verify that onboarding appears again.

The app must remain honest when no transport is available. Empty contacts, messages, reports, and relay counts must be shown as empty or unavailable rather than populated with fake live data.

## Stage 3 — Theme and accessibility verification

The theme system must support system-aware mode, explicit light mode, explicit dark mode, and user-selectable Air-Mesh accent colors. Every screen, card, field, tab bar, status indicator, button, QR panel, and empty state must remain readable in each supported combination.

Verify the following matrix:

| Test | Expected result |
|---|---|
| System light mode | Light background, dark text, visible borders, readable muted copy. |
| System dark mode | Dark background, light text, visible surfaces, readable muted copy. |
| Explicit light override | UI remains light even when the OS is dark. |
| Explicit dark override | UI remains dark even when the OS is light. |
| Accent selection | All supported accent colors persist and update buttons, indicators, active tabs, and selection states. |
| Relaunch | Theme mode and accent survive application restart. |
| Keyboard and safe areas | Inputs, bottom tabs, composer, and buttons remain reachable on portrait Android screens. |

## Stage 4 — Frontend route completion

The application must have no dead-end primary routes. The completed routes are Home, Messages, Chat, Contacts, Rescue, Shelter Report, Courier Sync, Reports, Settings, Profile, Audit Log, and About. The remaining creation routes must be exercised directly:

### New Group

The user enters a group name, selects one or more known contacts, and creates a local group chat. The new group must appear in Messages with a group type, member identifiers, a local-only preview, and no fabricated online status. The empty-contact case must disable creation and explain that a contact is required.

### Add Contact

The user can display the local identity QR and manually enter an offline peer identity package. The manual package format is `device-id|display name|public key`. The flow must validate the format, derive a shared secret through the existing pairing service, persist the richer contact record in the database, insert the UI contact, and report errors without crashing. QR scanning may remain a native-build follow-up if the scanner module is not yet included, but the screen must describe that limitation and keep manual entry functional.

### Route verification

Every button must be pressed once in the web preview or native development build. In particular, verify that **New group** routes to group creation, **Add contact** routes to pairing, successful pairing returns to Contacts, successful group creation opens the new group chat, and back buttons return to the correct parent route.

## Stage 5 — Native Android project and permissions

The Android project must be generated and committed. The manifest must explicitly expose the permissions required by the current foreground feature set and compatible Android versions. The runtime request flow must be user-facing and contextual rather than silently requesting every permission at first launch.

| Capability | Manifest/runtime review |
|---|---|
| Android 12+ BLE | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, and `BLUETOOTH_ADVERTISE` as required by the transport implementation. |
| Older BLE scanning | Location permission and device location-services state where required by the Android version. |
| Nearby Wi-Fi | Nearby/Wi-Fi state and network permissions only when Wi-Fi Direct transport is enabled. |
| Voice notes | `RECORD_AUDIO`, requested only when recording is initiated or explicitly prepared. |
| Notifications | `POST_NOTIFICATIONS`, requested with an explanation on supported Android versions. |
| Background relay future | Foreground-service permissions remain a separate stretch goal and must not imply that background relay already works. |

Run `pnpm android:env` and inspect `android/app/src/main/AndroidManifest.xml`. On a physical Android device, verify grant, deny, retry, and permanently-denied states. Verify that Bluetooth-disabled and location-disabled states show actionable copy instead of falsely reporting a connected mesh.

## Stage 6 — BLE and mesh transport implementation

The transport layer must remain adapter-based so the UI can operate safely in mock/web mode while native builds use BLE. The production adapter must implement discovery, connection, characteristic negotiation, notification subscriptions, write retry, disconnect cleanup, and event delivery to the service layer.

The protocol acceptance suite must cover:

1. 512-byte maximum chunk creation and deterministic reassembly.
2. Corrupted chunk rejection and incomplete-message expiry cleanup.
3. Duplicate message suppression by message identifier.
4. TTL decrement on forwarding and drop at zero.
5. Route-table updates and stale-route cleanup.
6. Bounded retry behavior on transient write failures.
7. Disconnection cleanup without leaking subscriptions or timers.
8. Offline queueing when no peer is available.
9. Correct handoff from encrypted envelope to database persistence and audit logging.

Two physical Android devices must then be used to validate discovery, pairing, encrypted message exchange, duplicate handling, and operation in Airplane Mode with Bluetooth manually enabled. A successful UI state is not sufficient evidence; capture logs or a reproducible manual result for each item.

## Stage 7 — Security and local data

The local security boundary must use device-native cryptographic primitives in a native development build and clearly isolated deterministic fallbacks only for web/Vitest environments. The review must confirm:

| Security/data check | Acceptance condition |
|---|---|
| Identity key pair | Generated locally and never sent to the base server as a private key. |
| Contact pairing | Peer public key produces a persisted shared-secret record. |
| Message encryption | AES-256-GCM envelope contains ciphertext, IV, and authentication tag. |
| Message decryption | Tampered ciphertext or tag fails closed. |
| Database | Contacts, chats, messages, reports, routing, files, and audit records use stable identifiers and indexes. |
| Audit trail | SOS, pairing, message, report, sync, and failure events are recorded locally. |
| Reset behavior | Clearing local app data removes local identity and keys without attempting a destructive remote operation. |

The security layer must not use test keys or seeded peer data in release UI state.

## Stage 8 — Base-camp backend

The Rust Axum base-camp server must compile, format, run its unit tests, and provide its documented local HTTP endpoints. SQLite persistence must support report ingestion, audit records, synchronization, latest insights, and deterministic fallback prioritization when Ollama is unavailable.

The backend verification sequence is:

```bash
cd base-laptop
cargo fmt -- --check
cargo test
cargo build
cargo run
```

With the server running, exercise health, report, sync, insight, and audit endpoints using the documented request fixtures. Confirm that malformed payloads return structured errors, repeated identifiers are idempotent where intended, and the frontend never claims a successful sync when the local HTTP or mesh transport has not accepted the payload.

The project requires a modern Rust toolchain. Cargo 1.75 cannot parse the Edition 2024 dependency currently resolved in the lockfile; the verified environment uses Rust/Cargo 1.97.1 or newer.

## Stage 9 — File, voice, and rescue features

Small file and voice-note flows must be tested on Android only after their native permissions and Expo modules are included in the development build. Files must be read and written in bounded chunks rather than loaded into memory without limits. Voice recording must release native resources and handle denial, cancellation, and interruption.

Rescue verification must cover Shelter Report creation, validation, local persistence, severity and needs selection, Reports filtering, Courier Sync empty states, retry behavior, and the base-camp fallback path. SOS must be audited locally whether or not a transport accepts it.

## Stage 10 — Automated verification commands

Run the following from the repository root before every push:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm android:env
./android/gradlew --version

source "$HOME/.cargo/env"
(cd base-laptop && cargo fmt -- --check && cargo test && cargo build)
```

The current local baseline is **12 passing Vitest tests and 1 intentionally skipped auth test**, zero TypeScript errors, lint passing with a Node module-format warning, Android preflight passing, Gradle wrapper inspection passing, and Rust formatting/tests/build passing with Cargo 1.97.1.

Where a command cannot run because the sandbox lacks hardware or an SDK, record the exact limitation rather than replacing it with fabricated success. The Android preflight currently reports Java 21, a present Gradle wrapper, declared Bluetooth/nearby permissions, but no `adb` and no configured Android SDK in the sandbox.

## Stage 11 — Release APK workflow

The supported APK path is `.github/workflows/android-release.yml`. It installs Java 17, pnpm, Node, the Android SDK, dependencies, runs Expo Doctor, runs the Android preflight, regenerates the native project from `app.config.ts`, runs `./gradlew assembleRelease`, and attaches `app-release.apk` to a GitHub Release.

Manual release dispatch requires a semantic tag input such as `v0.3.0`. The workflow creates the tag when needed and publishes the APK against that tag. A tag-triggered run is an alternative. The release must be checked for:

1. Successful dependency installation.
2. Successful native prebuild.
3. Successful Gradle release compilation.
4. An attached `app-release.apk` asset.
5. A release URL that is reachable from the repository.
6. Installation on a physical Android device.
7. Launch without Metro or internet access.
8. Correct permission prompts and offline onboarding.

The current remote run must be checked directly with:

```bash
gh run view 32297068416 --repo alham-rizvi/Air-mesh
 gh release view v0.3.0 --repo alham-rizvi/Air-mesh
```

OpenSSL deprecation warnings emitted while compiling `react-native-quick-crypto` are warnings, not proof of a failed build. Only the final Gradle error or the workflow conclusion determines success.

## Stage 12 — Physical-device acceptance matrix

At least two physical Android devices should be used for mesh behavior. The test record should include Android version, device model, app build/version, permissions granted, Bluetooth state, Airplane Mode state, and observed result.

| Scenario | Device A | Device B | Expected result |
|---|---|---|---|
| Offline onboarding | Required | Optional | Local identities created without internet. |
| Permission grant | Required | Required | Nearby permissions appear with rationale and grant successfully. |
| Permission denial | Required | Optional | App remains usable and Settings offers retry. |
| BLE discovery | Required | Required | Each device can discover the other through the native adapter. |
| Pairing | Required | Required | Public identity exchange creates local contact/shared-secret records. |
| Encrypted message | Required | Required | Message decrypts only for the paired recipient. |
| Relay/TTL | Required | Third relay device preferred | TTL and duplicate behavior match protocol tests. |
| Airplane Mode | Required | Required | Bluetooth-enabled local operation remains possible without internet. |
| SOS | Required | Optional | Event is queued/audited when no transport accepts it and delivered only when accepted. |
| APK launch | Required | Optional | Release APK launches without Metro. |

## Stage 13 — Documentation and release hygiene

Keep `docs/release.md`, backend documentation, database schema documentation, service documentation, demo script, testing matrix, and this plan synchronized with actual behavior. Remove obsolete statements whenever a feature changes from mock to native or from unavailable to verified.

Before creating a checkpoint, read `todo.md` and ensure completed tasks are marked `[x]`. Before pushing, run `git status --short`, inspect the diff, confirm that generated native files are tracked, and confirm that private signing artifacts are excluded. Push the exact commit to GitHub `main`, then verify the remote SHA and important file URLs.

## Current remaining items

The following items remain dependent on remote release completion or physical-device access rather than local source implementation:

| Item | Current state |
|---|---|
| APK asset | GitHub Actions run `32297068416` is/was compiling through Gradle; final conclusion and release asset must be confirmed. |
| Local Android device test | Blocked in sandbox because `adb` and Android SDK are not configured. |
| BLE interoperability | Requires at least two physical Android devices with a native development/release build. |
| Wi-Fi Direct | Interface/permissions are documented, but a production transport adapter and device test remain separate work. |
| Background mesh relay | Intentionally not claimed; requires a foreground service and additional lifecycle/security design. |
| QR scanning | Manual identity pairing is implemented; camera scanning remains a native-module follow-up unless added and tested. |

## Final sign-off checklist

- [ ] All source and generated Android files are pushed to GitHub `main`.
- [ ] TypeScript compilation passes.
- [ ] Lint passes without new warnings.
- [ ] Vitest passes with only intentionally skipped tests.
- [ ] Rust format, test, and build pass with an Edition 2024-capable toolchain.
- [ ] Android preflight passes and manifest permissions are reviewed.
- [ ] Expo prebuild completes on the release runner.
- [ ] `assembleRelease` completes on GitHub Actions.
- [ ] `app-release.apk` is attached to the intended GitHub Release.
- [ ] APK launches without Metro or internet.
- [ ] Permission grant, denial, retry, and Bluetooth-disabled states are verified.
- [ ] Two-device BLE pairing and encrypted messaging are verified.
- [ ] Rescue report, courier sync, audit, and SOS flows are verified.
- [ ] Final documentation and known limitations match observed behavior.

## References

[1]: https://docs.expo.dev/workflow/prebuild/ "Expo Prebuild documentation"
[2]: https://docs.github.com/en/actions "GitHub Actions documentation"
[3]: https://developer.android.com/develop/connectivity/bluetooth/ble/ble-permissions "Android Bluetooth permissions"
[4]: https://www.rust-lang.org/tools/install "Rust installation documentation"
