# Air-Mesh Android Release

The repository now contains `.github/workflows/android-release.yml`. It runs on a version tag such as `v0.2.0` or from GitHub Actions workflow dispatch, generates the Android project, builds `app-release.apk`, and attaches the APK to the corresponding GitHub Release.

A compiled APK is not checked into the source tree. The managed mobile build/release flow or GitHub Actions should produce it; manually running a full Android build in the sandbox is intentionally avoided because it is resource-heavy and does not represent the supported release path.

Real BLE transport also requires a native development build. Expo Go and the web preview use the unavailable/mock transport boundary and do not claim live peer connectivity. The app requests nearby-device permissions during account setup only after a user-facing rationale, and Settings provides a later retry path.


## Native Android project

The generated native Android project is now committed under `android/`. The manifest is at `android/app/src/main/AndroidManifest.xml`; the application module Gradle file is `android/app/build.gradle`; root Gradle settings are in `android/build.gradle` and `android/settings.gradle`; and generated application classes are under `android/app/src/main/java/`.

The manifest includes Bluetooth scan/connect, location, nearby Wi-Fi, microphone, notification, and related Expo-generated permissions. The project also includes `expo-dev-client` and `react-native-ble-plx` dependencies. The BLE service remains behind an injected adapter so the app can build safely before native transport wiring is completed.

Use `pnpm expo run:android` on a machine with the Android SDK and a connected emulator/device. Use `pnpm exec expo prebuild --platform android` after changing Expo config. Do not delete `android/` if you intend to maintain native changes directly; otherwise regenerate it from `app.config.ts` and package configuration.

## Android environment preflight

Run `pnpm android:env` before opening the native project. It checks the generated Gradle wrapper, manifest, Kotlin application classes, and Bluetooth/nearby permissions without compiling an APK. A local Android SDK with `ANDROID_SDK_ROOT`, `adb`, and platform tools is required for `pnpm expo run:android`; Java 17 is the reproducible CI baseline.

The sandbox does not compile APKs manually. The supported release path is `.github/workflows/android-release.yml`, which installs Java 17 and the Android SDK, runs Expo Doctor, runs the preflight, regenerates the Android project, builds `app-release.apk`, and attaches it to a GitHub Release. Trigger it manually from Actions or push a semantic version tag such as `v0.3.0`.

The Android native project is committed for Android Studio inspection, but the generated `android/app/debug.keystore` is intentionally excluded because it is a local signing artifact. Release signing should be added later through protected GitHub secrets or a managed signing service.
