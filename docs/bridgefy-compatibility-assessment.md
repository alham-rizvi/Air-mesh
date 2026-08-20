# Bridgefy SDK compatibility assessment

**Assessment date:** 20 August 2026  
**Reference reviewed:** [Bridgefy Android SDK repository][1] and its [SDK License Agreement][2].

## Decision

Air-Mesh will **not bundle, copy, modify, or redistribute** the Bridgefy SDK. Bridgefy’s published SDK is offered under a separate developer agreement that requires acceptance through Bridgefy and grants a personal, non-transferable, non-sublicensable license; it also restricts modification and distribution of the SDK. The SDK documentation describes a proprietary Maven dependency (`me.bridgefy:android-sdk:1.2.5`), an API key/session model, and a secure-connection facility. Those terms mean direct integration requires a Bridgefy developer account, API credentials, explicit acceptance of its agreement, and a separate product/legal decision. [1] [2]

> Air-Mesh may follow publicly described product concepts such as foreground peer discovery, P2P/mesh/broadcast transmission modes, bounded propagation, connection callbacks, and explicit secure-session states. It must implement those concepts with its own code and independently selected dependencies.

## Compatibility map

| Bridgefy concept | Air-Mesh equivalent | Current decision |
|---|---|---|
| `Bridgefy.start` and session lifecycle | `initializeMeshRuntime()` plus `MeshService.setTransport()` | Implemented as an Air-Mesh-owned runtime factory. |
| Nearby peer callbacks | `BlePlxTransport.startScan()` and Discovery screen | Implemented as bounded scan collection; physical Android validation required. |
| P2P / Mesh / Broadcast transmission modes | Direct encrypted send, TTL routing helpers, SOS broadcast | Current protocol foundation; native transport acceptance remains required. |
| Propagation profiles | `DEFAULT_TTL`, routing-table merge, deduplication | Partial; profile selection and durable relay queues remain future work. |
| Secure sessions | Air-Mesh X25519/AES-GCM boundary and local pairing | Partial; on-connection authenticated handshake remains future work. |
| SDK-managed radio stack | Air-Mesh-owned BLE adapter plus future advertiser/peripheral module | Required because `react-native-ble-plx` is central-only. |

## Native compatibility constraints

Bridgefy’s documentation targets Android 6+ and specifies Bluetooth scan, advertise, connect, and, in some scenarios, location permissions. Air-Mesh already declares scan/connect and nearby Wi-Fi boundaries; an advertiser/peripheral implementation would additionally require a native Android module and `BLUETOOTH_ADVERTISE` where applicable. Bridgefy’s high-level API cannot be transparently substituted for `react-native-ble-plx`, because Air-Mesh must retain its own encrypted frame, audit, SQLite, routing, and Base Camp synchronization contracts. [1]

## Implementation direction

The next Air-Mesh-owned layer will expose typed peer lifecycle and transmission modes above the existing `MeshTransport` boundary. The Android implementation will use the current central scanning/connection adapter, use explicit connection states, keep all message encryption and audit behavior in Air-Mesh, and use Base Camp’s existing local HTTP `/sync` endpoint for courier-to-base delivery. Advertising/peripheral GATT support, full three-device relay acceptance, and background operation remain deliberate hardware-gated phases.

## Release gate

No Bridgefy dependency is added to the repository. A managed APK release may be built after Air-Mesh’s own Android code compiles and its supported P2P path has been tested. A release must not claim complete mesh support until two-device connection and message exchange, then three-device forwarding, have been validated on physical Android hardware.

## References

[1]: https://github.com/bridgefy/sdk-android "Bridgefy Android SDK README"
[2]: https://github.com/bridgefy/sdk-android/blob/main/LICENSE.md "Bridgefy SDK License Agreement"
