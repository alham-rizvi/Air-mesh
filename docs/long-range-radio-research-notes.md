# Long-Range Radio Research Notes

## Requirement interpretation

The requested **700–800 m** neighborhood messaging target cannot be delivered by a stock phone Bluetooth radio alone. It requires a local Android-to-radio link plus a separate sub-GHz radio path between users. Bluetooth remains useful only as the short local companion link from a phone to its attached radio node.

## Documented reference architecture

Official Meshtastic documentation describes an open-source off-grid platform in which inexpensive LoRa radios create a long-range mesh; the radio nodes rebroadcast received messages, and a node can pair with a single phone over Bluetooth, Wi-Fi, or USB. The platform supports encrypted text exchange without existing communications infrastructure. [1]

The documentation also publishes exceptional long-distance records. Those are not an Air-Mesh product claim: they used specific frequency plans, antennae, firmware, and terrain conditions. Air-Mesh must treat **700–800 m as a field-test target**, not a guaranteed range, and publish the actual tested location, node model, antenna, settings, packet outcomes, and relay topology. [2]

## Design decision to validate

Air-Mesh should support a **certified, region-appropriate LoRa-class companion node** per user. The Android app connects locally by Bluetooth or USB to that node; node-to-node traffic is radio-only and does not require the internet. The first supported integration should use a documented external-node protocol rather than attempting to make the phone transmit on a licensed/regulated sub-GHz band by itself.

## Phone-only companion path

Android Wi-Fi Aware (API 26+) allows supported phones to discover a published service, send discovery messages, and establish a bidirectional Wi-Fi data connection without an access point or other connectivity. Android documents it as higher-throughput and longer-distance than Bluetooth, but does **not** state a fixed 200–300 m range. Hardware support and current availability must be checked at runtime; availability can conflict with Wi-Fi Direct, soft AP, tethering, user Wi-Fi/location state, and device firmware. [3]

Wi-Fi Direct is the compatibility fallback. Android documents direct nearby-device connections without a network or hotspot and permits socket transport, but it likewise provides no fixed range guarantee. On Android 13+, both paths require the runtime `NEARBY_WIFI_DEVICES` permission; Wi-Fi Direct sockets require `INTERNET` permission even when the device has no internet route. Air-Mesh must explain this accurately in UI and must not imply that the permission enables a cloud or internet dependency. [3] [4]

The phone-only hierarchy is therefore: **Wi-Fi Aware, if both phones support and expose it → Wi-Fi Direct, if both phones support it → BLE GATT for short-range messaging → local queue; optional LoRa remains the radio extension for field-tested neighbourhood coverage.**

## References

[1]: https://meshtastic.org/docs/introduction/ "Meshtastic introduction and architecture"

[2]: https://meshtastic.org/docs/overview/range-tests/ "Meshtastic range-test records and settings"

[3]: https://developer.android.com/develop/connectivity/wifi/wifi-aware "Android Wi-Fi Aware overview"

[4]: https://developer.android.com/develop/connectivity/wifi/wifi-direct "Android Wi-Fi Direct P2P guide"
