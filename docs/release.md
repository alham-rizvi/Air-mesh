# Air-Mesh Android Release

The repository now contains `.github/workflows/android-release.yml`. It runs on a version tag such as `v0.2.0` or from GitHub Actions workflow dispatch, generates the Android project, builds `app-release.apk`, and attaches the APK to the corresponding GitHub Release.

A compiled APK is not checked into the source tree. The managed mobile build/release flow or GitHub Actions should produce it; manually running a full Android build in the sandbox is intentionally avoided because it is resource-heavy and does not represent the supported release path.

Real BLE transport also requires a native development build. Expo Go and the web preview use the unavailable/mock transport boundary and do not claim live peer connectivity. The app requests nearby-device permissions during account setup only after a user-facing rationale, and Settings provides a later retry path.
