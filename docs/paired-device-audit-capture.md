# Air-Mesh P0 Paired-Device Audit Evidence Capture

This procedure is executed **only after** the Android GATT bridge APK is installed on two physical phones. The sandbox cannot generate this evidence because no Android phone/ADB device is attached.

## Required evidence

For each P0 case in [the two-phone acceptance matrix](two-phone-offline-acceptance.md), collect the release tag, Android model/API, permission state, offline/airplane-mode state, a short screen recording, and the local Air-Mesh audit log from each phone. Redact message contents, exact locations, and public keys before sharing evidence.

## Device-log capture

Use one workstation per attached device, or repeat the command for each device serial:

```bash
adb -s <DEVICE_SERIAL> logcat -c
adb -s <DEVICE_SERIAL> logcat | grep -E "AirMeshGatt|BluetoothGatt|BluetoothLeAdvertiser|ReactNative" > airmesh-device-<A-or-B>.log
```

Start capture before enabling nearby permissions. Record the timestamp for: advertising started, scan found service UUID, GATT connected, service discovery, notification subscription, message write/notification, disconnect, and reconnect. A successful user interface without these corresponding events is not enough to pass P0.

## In-app audit export

On both phones, open **Settings → Audit log**, filter the test window, and capture the records for `mesh_gatt_advertising_started`, peer connection transitions, pairing, message send/receive or queue outcome, SOS/report outcome, and disconnect/reconnect. Attach both audit captures to the test record template in `two-phone-offline-acceptance.md`.

## Pass rule

The P0 matrix passes only when Device A and Device B each show matching transport/audit evidence for the same message IDs while Wi-Fi and mobile data are disabled. A QR scan alone, a local contact record, or a queued message is not a pass.
