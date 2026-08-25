# Citizen-First Disaster-Response Contract

**Purpose.** Air-Mesh is a citizen-facing APK. Its first job is to help a person understand an alert and take the next safe action. The companion website is the operator surface for reviewing incoming reports, validating them, coordinating resources, and publishing only authorized alerts.

## Citizen mobile journey

| Step | Citizen sees | Citizen can do | Truthful state |
|---|---|---|---|
| 1. Alert | Hazard, affected place, issued time, source, and urgency | Open the alert | An official source is identified only after an approved provider feed is connected. |
| 2. Precaution | One concise, hazard-relevant action card and a link to the full offline guide | Read guidance; open 112 dialer when they choose | Guidance is offline content, not a dispatch confirmation. |
| 3. Status | Three clear choices: **I’m safe**, **Need help**, or **Report incident** | Save a local safety/check-in record or open a report | A local save is never presented as operator receipt. |
| 4. Incident report | Location only when the user chooses it, needs, severity, people affected, and notes | Submit to the website when connected; otherwise save/relay | Each report displays its current delivery state. |
| 5. Coordination | Incident-specific conversation only when the user needs it | Use offline nearby relay or a connected conversation | Queued, accepted, and delivered are separate protocol states. |

## Mobile and website boundary

The website team should expose an HTTPS endpoint such as `POST /api/v1/incidents` behind its own domain. Air-Mesh will not hard-code a development URL or embed website secrets in the APK. The endpoint must accept an idempotency key so an offline report can safely retry without duplicating an incident.

| Contract element | Mobile APK responsibility | Website responsibility |
|---|---|---|
| Report identifier | Generate a stable local UUID before any send attempt | Treat repeat identifiers as idempotent retries. |
| Citizen identity | Send an installation-scoped pseudonymous ID only if the citizen chooses to submit | Do not require an email/password to accept a report; rate-limit and mark unverified reports accordingly. |
| Delivery response | Mark **Dashboard received** only after a successful server receipt | Return a receipt ID and `pending_verification` or `verified` status. |
| Failure | Retain the encrypted/local report and mark **Queued offline** | Avoid returning ambiguous success responses. |
| Operator decision | Present any approved status update with timestamp and source | Verify reports before assigning resources or publishing public updates. |

## Expected report payload

```json
{
  "id": "stable-local-report-id",
  "occurredAt": "2026-08-25T12:34:56.000Z",
  "severity": "high",
  "needs": ["medical", "water"],
  "peopleAffected": 3,
  "notes": "Short, factual description from the citizen.",
  "location": { "latitude": 0, "longitude": 0 },
  "locationAccuracyM": 0,
  "installationId": "pseudonymous-local-installation-id"
}
```

Location must be omitted unless the citizen explicitly attaches it. The API must reject oversize notes, invalid coordinates, and repeated requests that exceed its rate limit. A website dashboard connection is **not configured** until the website team supplies its HTTPS base URL, request schema, receipt format, and public-key or token-exchange strategy.

## Delivery states

| State | Meaning shown to the citizen |
|---|---|
| **Saved on this device** | The report exists only on the APK. |
| **Queued offline** | No website connection is available; the APK will keep the report for a later user-approved retry or eligible nearby relay. |
| **Relayed to nearby device** | A compatible nearby peer accepted the encrypted report. This is not operator receipt. |
| **Dashboard received** | The configured website returned a receipt. The report may still require verification. |
| **Verified update received** | The website confirmed a status update with a timestamp. |

## Non-negotiable safety boundaries

The APK must never claim an official warning source, operator receipt, rescue dispatch, road safety, shelter capacity, or successful peer delivery without a corresponding source or protocol receipt. A 112 button remains a user-initiated dialer handoff; it does not create an emergency-service case.
