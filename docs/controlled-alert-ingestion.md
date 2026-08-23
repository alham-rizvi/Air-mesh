# Controlled Alert Ingestion

Air-Mesh now has a **local-first Alerts center**. An alert created on the device is stored in the device database, appears in the in-app inbox, and can request a native notification only after the device owner grants notification permission. This behavior does not depend on internet access.

The optional server path is intended for an **authorized publisher operated by the deployment owner**. It is not a government-feed scraper and it does not make any claim that an official warning source is connected.

| Capability | Current behavior | Boundary |
|---|---|---|
| Local alert creation | Durable local record, in-app prompt, optional native notification | Works without server connectivity after app initialization. |
| Controlled server ingestion | Validated tRPC `alerts.ingest` mutation with a configured publisher token | Requires server database availability and the deployment-owned token. |
| Server alert listing | `alerts.list` returns durable controlled-publisher records | The app reports service unavailability rather than inventing alerts. |
| Official/provider feed | Not enabled | Provider approval, credentials, terms, payload validation, and operational monitoring are still required. |

## Publisher payload

The publisher supplies the configured `ALERT_INGESTION_TOKEN` only to the server endpoint. It must never be bundled into the mobile app. A valid payload includes a unique ID, title, summary, type, severity, issue time, optional expiry, and an origin identifier. The server rejects invalid tokens and rejects expiry times before issue times.

> **Operational rule:** A publisher should use stable alert IDs and publish only reviewed, authorized alerts. Air-Mesh does not verify the factual accuracy of an external publisher’s content.

## Release and device validation

Native notification presentation requires an installed Android build and the device owner’s notification permission. The browser preview can verify in-app state but cannot prove device notification behavior. Real nearby-device transport and multi-device receipt validation remain separate physical-device acceptance gates.
