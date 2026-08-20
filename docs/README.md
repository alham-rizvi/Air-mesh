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

The project’s canonical verification command is `pnpm verify:all`. It checks the source and native configuration but does not replace two-device BLE acceptance on physical Android hardware.
