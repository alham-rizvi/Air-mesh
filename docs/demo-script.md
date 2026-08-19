# Air-Mesh Demo Script

## 1. Start locally

Run `pnpm install`, then start the Expo preview with `pnpm dev`. For the base camp, run `cd base-laptop && cargo run` with `MOCK_AI=1`. The mobile web/Expo Go preview is intentionally safe and honest: it shows local identity and empty states, while native BLE transport reports unavailable until a development build is installed.

## 2. Create local identities

Open Air-Mesh on two physical Android devices or two development-build instances. Create a local display name on each device. Grant nearby-device permissions when prompted. If permissions are denied, open Settings and retry; the app should explain that internet access is not required and that discovery is unavailable until permission is granted.

## 3. Pair and message

Use the contact identity/QR flow when available, or use the service-level pairing helper in an integration test. Confirm that a paired contact has a public key and shared-secret record. Send a text message and verify the encrypted envelope is stored locally, a transport result is surfaced honestly, and an audit log is written. In Expo Go/web, the expected result is queued/unavailable transport rather than a fabricated delivery success.

## 4. Mesh relay and SOS

With three development-build devices, place device B between A and C. Enable Bluetooth and nearby permissions. Start discovery, inspect the mesh status, and send from A toward C. Confirm TTL and duplicate handling at the service level. Trigger SOS and verify the integration facade broadcasts an emergency envelope and writes `sos_triggered`. If native BLE is unavailable, use the deterministic mesh protocol tests as the fallback demo.

## 5. Rescue report and base sync

Create a shelter report and verify it is stored as `local`. Run courier sync from the service layer, then connect to the Rust base endpoint and POST `/sync`. Check `/insights` and `/audit` on the base server. If no physical network is available, use `MOCK_AI=1` and the Rust smoke-test fixture documented in `base-laptop/README.md`.

## 6. Theme and recovery

Toggle light/dark/system modes and an accent palette in Settings. Restart the app and confirm preferences remain. Exercise a denied permission, a disconnected transport, duplicate frames, and a corrupted chunk. The expected behavior is a clear unavailable/failed state, no duplicate message insertion, and no uncaught UI error.

## Known limits

Physical two- or three-device BLE validation cannot be completed inside the sandbox. A native development build, Android SDK, and physical devices are required for real discovery, peripheral advertising, and relay testing. The repository includes the native project and GitHub Actions release workflow, but this environment does not produce a release APK directly.
