# Air-Mesh Phone-Only Wi-Fi Direct Acceptance

This is the **physical release gate** for the Android Wi-Fi Direct bridge. It does not require external radio hardware, an access point, cellular data, or internet connectivity. It also does not authorize a fixed coverage claim: Android documents direct nearby connection but supplies no 200–300 m range guarantee. [1]

## Preconditions

Install the same signed Air-Mesh APK on two Android phones with Wi-Fi Direct support. Give Air-Mesh the Nearby Wi-Fi and Bluetooth permissions it explains at startup. Disable mobile data and forget/disconnect normal Wi-Fi networks after the APK has been installed. `INTERNET` in the manifest supports Android local sockets; it must not be interpreted as a requirement for an internet route. [1]

| ID | Test | Pass evidence |
|---|---|---|
| P0-W1 | Device capability and permission | Both phones report supported nearby transport or an explicit fallback/local-only state; no fabricated capability. |
| P0-W2 | Discovery | Device A appears in Device B’s bounded scan and vice versa, using real device identity. |
| P0-W3 | Local connection | Both phones show `connecting` then `connected` only after the Wi-Fi Direct group and Air-Mesh socket are established. |
| P0-W4 | A to B offline message | With mobile data and Wi-Fi internet disabled, B receives and decrypts a message from A; both audit logs align. |
| P0-W5 | B to A offline message | Reverse-direction message is received with the same offline controls. |
| P0-W6 | Disconnect and reconnect | Group removal clears connection state, then a manual rediscovery/reconnect exchanges a new message. |
| P0-W7 | Range evidence | Walk the pair through the intended area and record success/failure points, building obstruction, model, OS version, and packet outcomes. Do not label 200–300 m as supported until this evidence is captured. |

If Wi-Fi Direct is unavailable or fails on either phone, document the result and run the BLE/GATT fallback acceptance procedure. For neighbourhood-scale, repeatable coverage, use the optional external LoRa radio path and its separate field gate.

## Reference

[1]: https://developer.android.com/develop/connectivity/wifi/wifi-direct "Android Wi-Fi Direct P2P guide"
