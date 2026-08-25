# RIH-PS-016 Alignment — Air-Mesh

Air-Mesh is being aligned to the supplied **Disaster Management Alert System** brief. The production-facing model is a controlled, authorized publisher service and a citizen APK. The app does not claim a government or emergency-service connection until an official provider has approved and configured it.

| RIH-PS-016 requirement | Air-Mesh implementation | Current boundary |
|---|---|---|
| Authorized authority flow | Header-authenticated controlled publisher routes create, update, and resolve alerts. | The publisher token must stay server-side and be held only by an authorized operator. |
| Alert payload | Each controlled alert stores ID, type/hazard, target label and coordinates/radius, severity, message, issued time, locale, and lifecycle status. | Alerts are validated for length, coordinates, expiry, and future timestamps. |
| Location-based alert | The publisher submits a defined target label, latitude, longitude, and radius. | The APK displays targeting metadata; it does not claim device-side geofence enforcement until authorized location data is configured. |
| User flow | The citizen sees an alert, safety guidance, “I’m safe”, “Need help”, and “Report incident” actions without a mandatory login. | Safety/rescue check-ins remain local-first and do not claim emergency dispatch. |
| Monitoring flow | The publisher can update severity/instructions and resolve an active alert. | Resolved alerts stop presenting as active records; Android native delivery still needs notification permission. |

## Required demonstration scenarios

The test suite exercises four hackathon scenarios: an authorized high-severity alert, a geo-targeted alert, an authorized update to severity/instructions, and an authorized resolution. The scenarios use controlled test data only; they must never be represented as live government warnings.
