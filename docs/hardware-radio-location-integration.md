# Hardware Radio, Location, and Emergency Integration

Air-Mesh now separates **phone-only BLE discovery** from a separate **external long-range radio** path. This follows the useful product pattern of a paired mobile application plus a dedicated RF accessory, but it does not bundle, emulate, reverse engineer, or claim compatibility with goTenna’s proprietary hardware or SDK. goTenna describes paired apps that provide encrypted text messaging, GPS location information, and low-capacity multi-hop networking through its own hardware and protocols.[1] [2]

| Air-Mesh capability | Implemented behavior | Hardware / release requirement |
| --- | --- | --- |
| Nearby BLE transport | Android native scan and central-side connection boundary | Two-device Android validation; GATT advertising remains a declared gap |
| External-radio transport | `ExternalRadioTransport` accepts an approved native partner client, reports the supplied radio state, and never synthesizes peers or range | A licensed vendor SDK, physical radio, vendor pairing flow, and device validation |
| Emergency broadcast | User-triggered SOS attempts one foreground GPS capture and includes it only with consent; the event is locally audited | Android/iOS location permission, enabled location services, and a reachable peer or radio |
| Rescue report persistence | The storage schema supports optional captured coordinates, accuracy, timestamp, and source | UI capture workflow may be connected to a shelter-report form after field validation |

> **Range policy:** Air-Mesh reports a range only when a hardware adapter provides a measured value. It makes no phone-only long-range or 151–154 MHz claim. Exact radio band, lawful power, range, antenna placement, and country-specific authorization are properties of the selected approved accessory and deployment—not this application.

## Integrating an approved accessory

Implement `ExternalRadioClient` in a native module that uses the vendor’s documented and licensed API. Call `registerExternalRadioClient(client)` only after the user has paired actual hardware. The client must expose real scan results, connection outcomes, inbound frames, and status; it may omit `measured_range_m` where it cannot measure range. The shared Air-Mesh chunking, encryption, TTL, deduplication, routing, audit, and persistence layers then continue to operate above the transport boundary.

No background GPS tracking is enabled. The app requests foreground location only when the operator presses SOS, checks whether location services are enabled, and continues with a location-free SOS if consent or a fix is unavailable. Expo’s platform documentation identifies foreground permissions, location-service checks, and one-time current-position capture as the appropriate APIs for this on-demand flow.[3]

## References

[1]: https://gotenna.com/ "goTenna — mesh networking platform"
[2]: https://gotenna.com/pages/gotenna-mesh-user-manual "goTenna Mesh User Manual"
[3]: https://docs.expo.dev/versions/latest/sdk/location/ "Expo Location documentation"
