# Air-Mesh Documentation

This directory contains the implementation, testing, release, and operational guides for Air-Mesh.

| Guide | Purpose |
|---|---|
| [Architecture](architecture.md) | Maps the app, service, security, transport, and base-camp boundaries. |
| [Full development verification plan](full-development-verification-plan.md) | Tracks the complete build and acceptance lifecycle. |
| [Testing](testing.md) | Describes deterministic tests and physical-device acceptance. |
| [Release](release.md) | Documents Android prerequisites and the managed APK workflow. |
| [Database schema](database-schema.md) | Explains local SQLite tables and platform split. |
| [Demo script](demo-script.md) | Provides a truthful offline-first walkthrough. |
| [Web assets](web-assets.md) | Records visual sources and attribution notes. |
| [Preview findings](debug-preview-findings.md) | Captures browser smoke checks and preview limitations. |
| [Bridgefy compatibility assessment](bridgefy-compatibility-assessment.md) | Documents the SDK licensing constraint and Air-Mesh-owned transport approach. |
| [Hardware radio, location, and emergency integration](hardware-radio-location-integration.md) | Documents the truthful external-radio adapter contract and consented SOS coordinates. |
| [Two-phone offline acceptance test](two-phone-offline-acceptance.md) | Provides the release-blocking physical Android test matrix for discovery, GATT, encrypted messages, offline operation, SOS, sync, and recovery. |
| [Paired-device audit capture](paired-device-audit-capture.md) | Defines the P0 logcat and in-app audit evidence needed from two physical Android phones. |
| [Phone-only Wi-Fi P2P acceptance](two-phone-wifi-p2p-acceptance.md) | Defines the no-external-hardware Android Wi-Fi Direct acceptance gate and field-evidence rules. |
| [Phone-only P2P transport design](phone-p2p-transport-design.md) | Explains the implemented Wi-Fi Direct bridge, BLE fallback, delivery boundary, permissions, and range limitations. |

The project’s canonical verification command is `pnpm verify:all`. It checks the source and native configuration but does not replace two-device BLE acceptance on physical Android hardware.
