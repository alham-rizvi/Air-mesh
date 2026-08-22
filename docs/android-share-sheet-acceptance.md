# Android Diagnostics Share-Sheet Acceptance

This procedure validates the device-only portion of Air-Mesh diagnostics sharing. It must be run on a physical Android phone after the **v1.4.0** APK release is available and installed. It is not a mesh-delivery test and does not require internet after the APK is installed.

| Test ID | Steps | Expected result | Evidence to record |
|---|---|---|---|
| SS-01 | Open **Settings → Mesh diagnostics → Export diagnostics file**. | Android’s native share sheet opens. | Screenshot of the share sheet, excluding any personal account details. |
| SS-02 | Choose a permitted local target such as Files/Downloads, then save the file. | A JSON file is created and can be found locally. | Filename and byte size. |
| SS-03 | Open the saved JSON file in a text viewer. | It contains topology, transport, route, queue, and retry metadata only. It contains no plaintext messages, ciphertext payloads, keys, chat IDs, or receipt payloads. | A redacted excerpt showing the `privacy` block. |
| SS-04 | Return to **Mesh diagnostics → Import support bundle** and select the saved file. | A read-only imported summary appears; no local routes, messages, contacts, or queues change. | Screenshot before and after import. |
| SS-05 | After importing, select **Export topology differences**. | Android’s native share sheet opens with a read-only, redacted comparison file. | Screenshot of the second share sheet and filename. |

Record **Pass**, **Fail**, or **Blocked** for every row. A failure should include Android version, device model, export target selected, and the exact user-visible error. Do not attach exported bundles to public issue reports without reviewing the redacted contents first.
