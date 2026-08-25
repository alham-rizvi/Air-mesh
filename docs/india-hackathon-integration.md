# India Hackathon Disaster-Response Foundation

Air-Mesh now models a local-first all-hazard response workflow for **floods, cyclones, earthquakes, heatwaves, landslides, wildfire, lightning, industrial incidents, and other hazards**. The foundation stores controlled alert targeting fields, authenticated safety/rescue check-ins, and durable local audit records. It is suitable for a hackathon demonstration and for future authorized integration work; it is **not** an official Indian public-warning or emergency-dispatch system.

## Working scope

| Capability | Current behavior | Boundary |
|---|---|---|
| Geo-targeted controlled alerts | Publisher can persist a zone label, latitude/longitude, radius, hazard, and locale. | Actual delivery to devices remains dependent on an authorized provider or installed app refresh. |
| Safety check-in | An authenticated web user can submit `safe` or `rescue_requested`; the server stores it idempotently. | `accepted` means stored, **not** dispatched to police, ambulance, or rescue teams. |
| Emergency handoff | The app can open `tel:112` only after a user action. | It does not call, monitor, or impersonate ERSS on the user’s behalf. |
| Offline guides | The app ships concise local guidance for first aid, supplies, and post-alert action. | Guidance does not replace emergency instructions or medical advice. |
| Multi-channel providers | Status metadata names future carrier, SMS, media, map, translation, and sensor adapters. | All are `not_configured` until an authorized provider is onboarded. |

## Secure protocol boundary

Air-Mesh exposes application APIs through HTTPS only; the externally reachable service is the managed HTTPS endpoint on **port 443**. Mobile and web clients make outbound HTTPS requests to `/api/trpc`. Any future provider adapter must be server-side, use a provider-issued credential stored outside client code, apply idempotency keys, time limits, structured audit logging, and HTTPS/TLS. A provider that requires mTLS, CAP signatures, or an allow-listed network must be integrated only after the responsible authority supplies its exact contract.

> No port is opened from the mobile device, and no mobile client stores a carrier, SMS, map, sensor, or translation secret.

## India integration status

India’s ERSS describes **112** as a nationwide emergency number and lists multiple incident channels, while the official NDMA Sachet portal describes a CAP-based, geo-intelligent, multilingual, multi-media warning system. Air-Mesh therefore treats those systems as authoritative external services—not as APIs it may invoke without approval. [1] [2]

The official SACHET portal publishes CAP-based, geo-targeted alerts and exposes an RSS feed subscription page. That makes a server-side read-only RSS/CAP adapter the viable integration candidate for Air-Mesh, subject to feed-format validation, rate limits, and the NDMA terms applicable to the intended use. It is not a license to originate alerts, obtain cell-broadcast delivery, or represent Air-Mesh as an NDMA application. [2] [4]

The current adapter catalog is deliberately honest: ERSS is a user-initiated dialer handoff; CAP/NDMA, cell broadcast, SMS, media, maps, translation, and sensors are visible but unconfigured. The server must receive the provider agreement and credentials before changing an adapter to active. A public feed can only be labeled active after its exact endpoint, permitted use, freshness, and failure behavior are verified in the deployed environment.

## References

[1]: https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss "Ministry of Home Affairs — Emergency Response Support System"
[2]: https://sachet.ndma.gov.in/ "NDMA Sachet — National Disaster Alert Portal"
[3]: https://ndma.gov.in/ndma-guidelines "NDMA Guidelines"
[4]: https://sachet.ndma.gov.in/CapFeed "NDMA Sachet — CAP/RSS feed subscription"
