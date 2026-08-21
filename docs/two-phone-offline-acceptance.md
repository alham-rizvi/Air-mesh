# Air-Mesh Two-Phone Offline Acceptance Test

**Purpose:** This is the release-blocking physical-device acceptance procedure for genuine Air-Mesh offline communication. It is designed to verify the whole process—not merely that two APKs launch or that a QR code is readable.

**Status at document creation:** **Blocked by native peripheral/GATT-server implementation.** The present `react-native-ble-plx` adapter scans and connects as a BLE central, but it does not make either Air-Mesh phone advertise the Air-Mesh GATT service. QR pairing is local identity/key exchange only and cannot create a radio link.

> A passing two-phone test may be recorded only after at least one participating phone exposes the Air-Mesh service as a Bluetooth LE advertiser/GATT server and the other phone discovers that real service. Android’s own guidance distinguishes scanning, advertising, and connecting permissions, and describes GATT clients connecting to a GATT server hosted by the other device. [1] [2]

---

## 1. Strict Acceptance Rule

The application must **not** be described as phone-to-phone offline mesh-capable until all mandatory rows marked **P0** pass on real Android devices. Automated tests validate protocol and UI boundaries; they do not replace radio interoperability.

| Result | Meaning | Release claim allowed |
|---|---|---|
| **Blocked** | Required native advertiser/GATT server is absent. | “Offline-first app with BLE transport boundary.” |
| **Failed** | Required test ran but did not satisfy pass criterion. | No live peer or mesh claim. |
| **Passed** | Required test met criterion and evidence was captured. | Claim only the capability directly proven. |
| **Not applicable** | Optional hardware mode was not installed. | No claim for that optional mode. |

---

## 2. Required Setup

### 2.1 Hardware and build checklist

| Item | Device A | Device B | Required state |
|---|---|---|---|
| Android version | Record | Record | Android API 24 or later. |
| Model / manufacturer | Record | Record | Physical Android phones; emulators do not qualify. |
| Air-Mesh build | Record version/commit | Record version/commit | Same signed release or compatible native development build. |
| Bluetooth LE support | Yes | Yes | Enabled and verified by system settings. |
| Nearby permissions | Granted | Granted | Scan, Connect, and Advertise where the transport requires them. |
| Location permission | Record | Record | Required only on Android versions where discovery needs it. |
| Airplane mode | Later test | Later test | Initially off for installation/log capture, later on for offline test. |
| Internet | Initially optional | Initially optional | Must be disabled for the offline acceptance stages. |
| GATT peripheral role | Optional | **Required** | At least one device must advertise the Air-Mesh service UUID. |

### 2.2 Environment controls

1. Install the same Air-Mesh release on both devices. Record the release tag, APK checksum, Android version, and device model.
2. Clear Air-Mesh app data on both phones before the first run.
3. Confirm Bluetooth is enabled. Do **not** treat “Bluetooth enabled” as proof that advertising is active.
4. Confirm both devices accept the nearby-device permission rationale and grant the needed permissions.
5. Disable mobile data and Wi-Fi before tests marked **offline required**. For the strictest test, enable Airplane Mode and manually re-enable Bluetooth if the device permits it.
6. Capture evidence for every P0 row: screen recording or screenshots plus timestamped local audit logs from both devices.

---

## 3. Native Transport Precondition

### 3.1 Required native implementation before this procedure can pass

The native Android transport must add a bridge for all of the following:

| Native capability | Air-Mesh requirement | Observable evidence |
|---|---|---|
| BLE advertiser | Start/stop advertising the Air-Mesh service UUID. | A scanner on Device A discovers Device B by service UUID. |
| GATT server | Host the Air-Mesh service and `MESSAGE_INBOX`/`MESSAGE_OUTBOX` characteristics. | Device A completes service discovery and finds expected UUIDs. |
| Permission handling | Request `BLUETOOTH_ADVERTISE` in addition to scan/connect on Android 12+. | System Nearby permission is granted; feature does not silently fail. |
| Connection callbacks | Send connected/disconnected/MTU/service events over the React Native bridge. | UI and audit log transition only after callback evidence. |
| Characteristic I/O | Receive writes and issue notifications/indications for encrypted frames. | A frame sent by Device A is delivered to Device B and vice versa. |
| Lifecycle cleanup | Stop advertising, close GATT server, and remove subscriptions on screen exit/restart. | No stale connection after app close; reconnect succeeds. |

The existing central client cannot provide these operations alone. Android requires `BLUETOOTH_ADVERTISE` to make a device discoverable and `BLUETOOTH_CONNECT` for communication with paired/connected devices. [1]

### 3.2 Precondition test: advertising service is visible

| ID | Priority | Steps | Pass criterion | Evidence |
|---|---|---|---|---|
| P0-00 | Blocking | Start the peripheral/GATT role on Device B; open Discovery on Device A; run one bounded scan. | Device A lists Device B with a real ID/RSSI and no invented placeholder device. | Device A scan result, Device B advertiser/GATT log. |
| P0-01 | Blocking | Stop advertising on Device B; scan from Device A again. | Device B is absent after scan completion; UI says no service found rather than connected. | Scan completion screen and audit log. |
| P0-02 | Blocking | Restart advertising on Device B and repeat P0-00 three times. | Discovery succeeds three consecutive times without process restart. | Three timestamped result records. |

If P0-00 fails because no advertiser/GATT implementation exists, stop the acceptance run and record **Blocked**. QR pairing, manual contact creation, or an internet connection must not be used as a substitute.

---

## 4. Full Two-Phone Acceptance Matrix

### 4.1 First launch, compatibility, and permission

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P0-10 | P0 | Compatible-device gate | Launch on each supported phone. | App identifies Android readiness before discovery and offers nearby permission explanation/local-only continuation. |
| P0-11 | P0 | Permission grant | Select **Enable nearby discovery** on both phones. | System permission prompt appears after rationale; app reports granted state. |
| P0-12 | P0 | Permission denial/retry | Deny on Device A, continue local-only, then retry from Settings. | Local account remains usable; scan is blocked with actionable copy; retry changes state when granted. |
| P1-13 | P1 | Unsupported feature behavior | Run on a device missing BLE capability, if available. | App disables transport path and preserves local-only records. |
| P1-14 | P1 | Bluetooth off | Turn Bluetooth off after permission grant. | Scan cannot claim success; UI identifies readiness/transport failure and never fabricates peers. |

### 4.2 Local identities and QR/manual pairing

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P0-20 | P0 | Offline identity creation | Disable network; clear app data; create local names on both phones. | Identity persists locally after relaunch; no sign-in or network request is needed. |
| P0-21 | P0 | QR identity meaning | Display Device B QR; scan or manually enter its identity on Device A. | Device A stores a contact/shared-secret identity record only. It does not display “connected” solely because of QR exchange. |
| P0-22 | P0 | Reverse identity exchange | Repeat Device A → Device B. | Both devices have independent local trusted-contact records. |
| P1-23 | P1 | Invalid package | Enter malformed identity package. | Validation rejects package; no partial contact or false pairing success. |
| P1-24 | P1 | Re-pair/idempotency | Add same identity twice. | App handles duplicate deterministically without duplicate live-peer state. |

### 4.3 Discovery, GATT connection, and reconnect

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P0-30 | P0 | Bounded discovery UI | Device B advertises; Device A starts scan. | Spinner, countdown, bounded completion, and Device B result appear. |
| P0-31 | P0 | Service discovery | Tap Device B → Connect. | State progresses discovered → connecting → connected only after GATT callback and service/characteristic discovery succeed. |
| P0-32 | P0 | Reverse direction | Make Device A advertiser/GATT server and Device B central; repeat. | The opposite direction also completes. |
| P0-33 | P0 | Explicit disconnect | Disconnect from Device A. | GATT subscription is removed, peer state becomes disconnected, no stale connected badge remains. |
| P0-34 | P0 | Reconnect | Reconnect to same device after P0-33. | Connection and service discovery succeed again without app reinstall. |
| P1-35 | P1 | Restart recovery | Force-close advertiser device, reopen/start advertiser, rescan from client. | Old link is cleaned up; current service can be rediscovered and reconnected. |
| P1-36 | P1 | Out-of-range recovery | Walk devices apart until link breaks, then return close. | Disconnect is shown honestly; manual rescan/reconnect is possible. |

### 4.4 Encrypted direct messages and data-plane behavior

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|
| P0-40 | P0 | A → B encrypted text | Connect Device A to B; send a short text. | B receives plaintext after local decrypt; both audit logs record the appropriate send/receive event. |
| P0-41 | P0 | B → A encrypted text | Send reply. | A receives plaintext; no internet is enabled. |
| P0-42 | P0 | Message while disconnected | Disconnect and send from A. | Message is queued/persisted locally; UI does not claim delivery. |
| P0-43 | P0 | Delivery after reconnect | Reconnect and retry/flush supported queue. | Delivery becomes recorded only after transport accepts it. |
| P1-44 | P1 | 512-byte chunk boundary | Send text or fixture payload longer than 512 bytes. | Receiver reassembles exact content once. |
| P1-45 | P1 | Duplicate suppression | Re-send same envelope/message ID using test control. | Receiver stores/displays one copy and records dedupe behavior if exposed. |
| P1-46 | P1 | Corrupt/incomplete frame | Inject malformed or incomplete test frame through native harness. | Receiver fails closed; no crash, plaintext corruption, or false success. |
| P1-47 | P1 | Receive callback evidence | Send one frame while native logs are captured. | Native characteristic notification/write is observed and the MeshService inbound callback produces the message event. |

### 4.5 Mesh, relay, and transmission modes

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P1-50 | P1 | P2P mode | A connects directly to B; select direct send. | Only direct peer is used and message reaches B. |
| P1-51 | P1 | Broadcast mode | Connect A to B and C (three-device test). | Each connected peer receives one broadcast frame. |
| P1-52 | P1 | Mesh relay | Arrange A ↔ B ↔ C with no A ↔ C link. | A message destined for C is forwarded through B with TTL decrement. |
| P1-53 | P1 | TTL stop | Use a message with TTL 1 in a relay-only path. | B does not forward after TTL reaches zero. |
| P1-54 | P1 | Routing update | Change path availability. | Routing table changes do not create duplicate delivery or stale false route. |

### 4.6 Strict offline network test

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P0-60 | P0 | Airplane-mode message | On both devices enable Airplane Mode, then manually re-enable Bluetooth; confirm Wi-Fi and mobile data are disabled. Repeat P0-30 through P0-43. | Discovery, connection, and two-way encrypted messages work solely over the approved BLE/GATT transport. |
| P0-61 | P0 | No hidden server dependency | Keep both devices offline; inspect UI and audit entries during message exchange. | No login, DNS, Base Camp, cloud, or QR network step is necessary for direct local peer messages. |
| P1-62 | P1 | Reboot offline recovery | Reboot both devices in offline condition; restore Bluetooth; reopen Air-Mesh. | Local identities persist; rescan/reconnect operates as designed. |

### 4.7 SOS, rescue reports, and Base Camp integration

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P0-70 | P0 | SOS with no link | Trigger SOS while no peer is connected. | Event is audited and queued locally; no fake delivery result. |
| P0-71 | P0 | SOS with accepted peer | Connect A and B; trigger SOS on A. | B receives the emergency envelope or an explicit accepted transport result; A audit records outcome. |
| P1-72 | P1 | Optional location | Explicitly grant location and attach it to SOS. | Coordinates appear only in the consented message/report payload; no location is collected for ordinary BLE discovery. |
| P1-73 | P1 | Shelter report sync by courier | Create report on A, carry B as courier/connected peer. | Report persists locally and synchronization status changes only after an accepted operation. |
| P1-74 | P1 | Base Camp local HTTP | Start Rust Base Camp on a laptop local network; submit `/sync`. | `/health`, reports, insights, audit, and sync responses match actual persisted data. |

### 4.8 External-radio and lifecycle scenarios

| ID | Priority | Test | Steps | Expected pass result |
|---|---|---|---|---|
| P2-80 | P2 | External radio adapter absent | Launch without hardware accessory. | App reports no external adapter and does not claim band/range. |
| P2-81 | P2 | External radio adapter present | Use a separately licensed supported adapter. | App reports only adapter-supplied state and measured range. |
| P1-82 | P1 | Background transition | Background and restore app during active connection. | Current release either maintains the documented foreground behavior or disconnects honestly; no background-relay claim is made. |
| P1-83 | P1 | Battery/lifecycle cleanup | End test and inspect logs. | Scans stop, GATT resources close, subscriptions are removed, and reconnect still works. |

---

## 5. Evidence Record Template

Fill one record per test row. A release cannot pass P0 with only verbal confirmation.

```text
Test ID:
Release tag / commit:
Device A: manufacturer, model, Android API, app version:
Device B: manufacturer, model, Android API, app version:
Peripheral/GATT implementation build and version:
Bluetooth state / permissions on A:
Bluetooth state / permissions on B:
Wi-Fi state / mobile-data state / Airplane Mode state:
Steps performed:
Observed result:
Expected result:
Pass / Fail / Blocked / Not applicable:
Evidence file names or log excerpts:
Tester / timestamp:
```

For P0-40, P0-41, and P0-60, attach evidence from both phones showing the peer state, message outcome, and audit record. Redact public keys, message content, or location as appropriate before sharing test evidence.

---

## 6. Failure Triage

| Symptom | Most likely cause | Required next check |
|---|---|---|
| Scan ends with no peer | No Air-Mesh advertiser/GATT server, wrong service UUID, denied scan permission, Bluetooth off, or out of range. | Confirm Device B advertiser state and service UUID before changing UI. |
| QR succeeds but no connection | Expected with current build: QR stores identity/key material but does not advertise/connect Bluetooth. | Implement/enable native advertiser + GATT server; run P0-00. |
| Connection fails after peer appears | GATT service/characteristics absent, permission missing, callback failure, or incompatible UUID. | Capture service discovery and native connection callback logs. |
| “Connected” but message not received | Characteristic write/notification mapping, encryption/key mismatch, MTU/chunk issue, or callback bridge problem. | Run P1-47 then P1-44 with logs on both devices. |
| Message says delivered offline without peer | Product defect. | File a blocking bug; delivery must require accepted transport evidence. |
| SOS says sent without evidence | Product defect. | Validate audit/event outcome and distinguish queued from accepted. |
| Works with Wi-Fi but not Airplane Mode | Hidden network dependency or incomplete peripheral BLE path. | Run P0-60 with both radios/data states recorded. |

---

## 7. Automated Checks That Must Remain Green

Before any physical run, execute:

```bash
pnpm verify:all
```

The deterministic suite currently validates Android readiness/rationale, bounded scan calculation, BLE scan collection, protocol chunking and dedupe, peer lifecycle and modes, inbound P2P callback behavior using the loopback boundary, database/audit/security integration, radio/location validation, and asset constraints. These tests are **necessary but not sufficient** for P0 radio acceptance.

`tests/gatt-peripheral-transport.test.ts` additionally validates the hybrid transport contract: an Android peripheral advertiser is started, server-side GATT writes are delivered to the mesh callback, server connection events alter peer state, and a response falls back to GATT notifications when the peer is not a central-client connection. `tests/gatt-framing.test.ts` verifies each characteristic value remains within the conservative 20-byte default ATT payload and is reassembled per device before the MeshService sees it. These remain deterministic bridge contracts, not Bluetooth radio tests.

---

## 8. Completion Decision

The two-phone offline feature is eligible for a production claim only when:

1. The native Android BLE advertiser/GATT-server module is implemented and permissioned.
2. Every P0 row in this document is passed with captured evidence.
3. P0-60 passes with both devices offline and Bluetooth manually enabled.
4. The release APK used in the test is identified by tag, commit, and checksum.
5. Known P1/P2 limitations are either passed or explicitly disclosed in release notes.

Until then, the accurate statement is:

> “Air-Mesh includes an Android native BLE peripheral/GATT bridge and conservative GATT frame handling, but two-phone hardware acceptance remains required before any verified phone-to-phone offline-delivery claim.”

---

## References

[1]: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions "Android Bluetooth permissions"

[2]: https://developer.android.com/develop/connectivity/bluetooth/ble/connect-gatt-server "Android: Connect to a GATT server"

[3]: https://github.com/alham-rizvi/Air-mesh/blob/main/mobile/src/services/ble-transport.ts "Air-Mesh BLE central transport boundary"

[4]: https://github.com/alham-rizvi/Air-mesh/blob/main/docs/full-development-verification-plan.md "Air-Mesh full development verification plan"
