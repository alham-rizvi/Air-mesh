# Air-Mesh Phone-Only P2P Transport Design

## Objective

Air-Mesh now provides a **phone-only Android local transport** that does not require a cellular plan, Wi-Fi access point, internet route, or external radio accessory. It is intended for nearby users, not a guaranteed long-range network. The first implementation uses **Wi-Fi Direct** because Android documents direct, secure P2P connections and local socket use without a network or hotspot. [1]

## Transport hierarchy

| Priority | Transport | Implementation state | Delivery boundary | Range statement |
|---|---|---|---|---|
| 1 | Wi-Fi Direct | Implemented as a native Android bridge | Wi-Fi Direct group plus local TCP socket established | Nearby best effort; no distance guarantee. |
| 2 | BLE central + GATT peripheral | Implemented as native Android bridge | GATT connection/subscription accepts packet | Short-range fallback; no distance guarantee. |
| 3 | Local queue | Implemented | No peer transport accepts packet | Local persistence only; never a delivery claim. |
| 4 | External LoRa node | Adapter boundary only | Hardware reports actual state | Optional extension; field test required. |

Wi-Fi Aware remains a future preferred enhancement for phones whose hardware exposes it. Android documents direct discovery and bidirectional data paths without an access point, and notes higher throughput/longer distance than Bluetooth; capability and availability are device-dependent. [2]

## Wi-Fi Direct bridge lifecycle

1. The app checks whether the native build exposes Wi-Fi Direct and whether the device reports the platform feature.
2. After the user grants nearby permissions, the bridge registers Android P2P state/peer/connection broadcasts and starts bounded peer discovery.
3. A chosen peer begins group formation. The UI is **not** marked connected at this point.
4. The group owner opens the Air-Mesh local server socket; the client connects to it. The bridge emits `connected` only when this socket stream is established.
5. Mesh frames are length-prefixed on the local socket. The existing protocol, chunking, encryption boundary, persistence, deduplication, and audit layers remain above this transport.
6. A socket failure or group teardown closes resources and emits a real disconnected/failed state; unsent content is not reported as delivered.

## Permission and privacy boundary

On Android 13+, the feature requests `NEARBY_WIFI_DEVICES`. On Android 12 and below, discovery may require the location runtime permission. The bridge also declares `INTERNET` because Android Java sockets require it; this is a socket capability declaration, **not** an internet-route requirement. Air-Mesh does not send message data to a server in the Wi-Fi Direct data path. [1]

## Acceptance decision

The implementation is code-complete only after Android native compilation succeeds. The feature is user-verified only when [the two-phone Wi-Fi Direct matrix](two-phone-wifi-p2p-acceptance.md) passes on the intended phone models while mobile data and Wi-Fi internet are disabled. A 200–300 m claim remains prohibited until repeatable field evidence exists for the specific device models, firmware, obstruction conditions, and node topology.

## References

[1]: https://developer.android.com/develop/connectivity/wifi/wifi-direct "Android Wi-Fi Direct P2P guide"

[2]: https://developer.android.com/develop/connectivity/wifi/wifi-aware "Android Wi-Fi Aware overview"
