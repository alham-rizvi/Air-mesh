# Air-Mesh Disaster Response Feature Specification

**Purpose.** Air-Mesh is being positioned as a **local-first disaster-alert management and coordination workspace**. The current product can retain local alerts, allow acknowledgement, show an optional controlled-publisher feed, keep structured reports locally, and expose mesh, courier, audit, and Base Camp boundaries. It must not be described as a live official-alert service or a production-proven multi-phone mesh until authorized providers and physical-device acceptance tests are in place.[1] [2]

> **Operating principle:** Local alert records and local coordination remain useful without internet. Any field-to-field, courier, Base Camp, provider, location, or notification capability must show its actual readiness and never fabricate a peer, route, recipient acknowledgement, map position, or warning source.

## Capability baseline and delivery rules

| Existing foundation | Current state | Constraint carried into this roadmap |
|---|---|---|
| Local alerts and acknowledgement | Durable on-device records, in-app presentation, dashboard, search, filters, and acknowledgement | An acknowledgement currently records a local operator action; it is not proof that another person read the alert. |
| Controlled publisher alerts | Validated, idempotent server ingestion and listing | A deployment owner must authorize publishers. No official government, weather, IoT, or social provider is connected.[1] |
| Secure messaging and routing | Local queues, message states, receipts model, retry history, TTL/routing helpers | Native BLE/Wi-Fi Direct/GATT interoperability remains a hardware acceptance gate.[2] |
| Shelter reports and courier/Base Camp seams | Local structured reports, courier UI, Rust Base Camp and local data models | Real courier-to-base acknowledgement and conflict handling require field validation.[2] |
| Diagnostics and audit | Local route/queue diagnostics, redacted support exports, persistent audit records | Observed local state only; no invented topology, range, or device presence. |

## Feature catalogue

The catalogue is organized around the pasted brief. “Build state” distinguishes an existing foundation from a planned capability; it is not a claim that the feature is already enabled.

| # | Feature and description | Technical design and existing components | UI/UX and data boundary | Difficulty | Demo value | Priority | Build state |
|---:|---|---|---|---|---|---|---|
| 1 | **Multi-level alert broadcast.** Advisory, Watch, Warning, and Critical alerts use distinct visual and vibration treatment. | Extend `DisasterAlert` severity, local presentation preferences, controlled ingestion, durable audit, and route envelope metadata. Critical rebroadcast is a bounded, battery-aware queued action. | Dashboard filter, severity banner, acknowledgement timeline, “locally acknowledged” label. Never show recipient/read status without authenticated receipt evidence. | Medium | High | Critical | Foundation exists; propagation policy is planned. |
| 2 | **Zone-aware alerts.** Target alerts to named shelters, danger areas, and safe zones. | Store versioned zone polygons/labels locally; attach zone IDs to alert payloads; evaluate only with explicit location permission and offline tiles. | Alert shows “inside/near/unknown” zone state, source and timestamp. No GPS position is collected or displayed without consent. | Hard | High | High | Planned. |
| 3 | **Offline weather observations.** Preloaded advisories and structured field observations. | Import signed pre-disaster packs; local weather report form; courier sync; Base Camp can summarize approved observations. | Separate “official preloaded bulletin,” “controlled publisher,” and “field observation” badges. | Medium | High | Medium | Planned; no live weather feed. |
| 4 | **Shaking and evacuation support.** Device-assisted incident report and preloaded evacuation guidance. | Treat accelerometer signals only as local observations; require multi-device corroboration and human review before alert creation; prepackage static routes. | Prominent “unverified observation” state and one-tap evacuation checklist. Do not claim earthquake detection or early warning. | Hard | Medium | Low | Planned research. |
| 5 | **Resource inventory.** Track water, food, medical, fuel, and shelter materials. | Add local inventory ledger, stock threshold rules, resource-request report type, courier reconciliation, and Base Camp aggregation. | Inventory list with last verified time, local/relayed source, low-stock status, and conflict indicator. | Medium | High | Critical | Planned. |
| 6 | **Supply movement.** Track consignments between depot, courier, and shelter. | Signed local handoff events, QR/manual reference, custody states, receipt envelopes, and idempotent merge rules. | Timeline: packed → handed over → received → reconciled. Show “pending receipt” rather than pretending delivery is complete. | Hard | High | Medium | Planned. |
| 7 | **Volunteer coordination.** Match skills, shifts, and assignments. | Encrypted local volunteer roster, role/skill tags, task events, nearby availability only when volunteered, courier merge. | Stress-friendly task cards, explicit opt-in availability, check-in timer, and safety contact link. | Medium | High | High | Planned. |
| 8 | **Medical-resource triage.** Coordinate supplies and capacity without clinical diagnosis. | Restricted-access inventory/report records, minimum-necessary tags, retention limits, audit trails, and Base Camp aggregation. | “Operational priority,” not diagnosis; role-gated views and privacy warning before sharing sensitive details. | Hard | Medium | High | Planned. |
| 9 | **Priority communication.** Text templates, voice notes, images, location references, and priority queues. | Extend encrypted message content types, attachment manifest/chunking, local outbox priority, receipt model, and storage quotas. | Preset incident templates and explicit queued/accepted/delivered states. Attachment delivery remains unavailable until transport supports it. | Hard | High | High | Text foundation exists; media is planned. |
| 10 | **Push-to-talk and emergency voice.** Store-and-forward voice rather than assumed phone calls. | Encoded audio clip attachment, duration/size limits, priority queue, optional Wi-Fi Direct streaming only after transport validation. | Hold-to-record with a clear local-save state; never label it “live call” unless an active validated channel exists. | Hard | High | High | Planned. |
| 11 | **Consent-based location sharing.** Last-known location and search breadcrumbs. | Opt-in encrypted location records with expiry, precision controls, a local consent token, and courier synchronization. | Clear sharing timer, precision selector, revoke action, and “unknown” state when unavailable. | Hard | High | Critical | Planned. |
| 12 | **Family reunification.** Match missing-person and found-person cases. | Privacy-minimized case records, encrypted identifiers, offline matching suggestions, human confirmation, and limited retention. | Separate “possible match” from confirmed match; no automatic biometric/photo identification. | Hard | High | High | Planned. |
| 13 | **Damage assessment.** Structured field observations and evidence. | Reuse report persistence, add asset manifest, damage taxonomy, optional consented location, courier relay, Base Camp aggregation. | Fast three-level damage form with photos optional, offline save confirmation, and later sync state. | Medium | High | Critical | Planned. |
| 14 | **Shelter population and capacity.** Track occupancy and urgent needs. | Extend shelter report schema with capacity, aggregate count, vulnerable-needs counts, source time, and conflict rules. | Capacity gauge based only on entered data; “stale” marker when no recent update exists. | Medium | High | Critical | Report foundation exists; extension is planned. |
| 15 | **Disease-pattern monitoring.** Detect operational symptom clusters. | De-identified aggregated symptom counts, threshold review workflow, Base Camp trend calculation, and strict access logging. | Public view shows operational status only; no individual diagnosis, treatment recommendation, or automatic quarantine instruction. | Hard | Medium | Medium | Planned. |
| 16 | **Situation reports.** Summarize validated local records at Base Camp. | Use the existing Rust Base Camp insight boundary only with reviewed, redacted report data; include provenance/time window. | “Draft for coordinator review,” source-count, missing-data, and uncertainty panels. | Medium | High | Medium | Base Camp foundation exists; workflow is planned. |
| 17 | **Mesh health map.** Visualize observed devices, routes, and coverage gaps. | Build on current diagnostics topology graph, route table, peer metrics, and imported support comparisons. | Observed-only graph, no inferred distances; filter by time/transport and show stale data. | Medium | High | Medium | Foundation exists; expansion is planned. |
| 18 | **Backup and recovery.** Recover local response data after device loss. | Encrypted support bundle, signed snapshot manifest, courier/Base Camp copy receipt, conflict-resolution policy, restore preview. | Recovery wizard shows exactly what will merge; no silent overwrite. | Hard | High | Medium | Diagnostics export exists; recovery is planned. |
| 19 | **Power and device health.** Preserve response capability under low battery. | Battery telemetry, user-controlled low-power profile, bounded scan schedule, charging-point records, and audit events. | A low-power card suggests actions and lets operators defer noncritical sync. Background operation needs Android field measurement. | Medium | Medium | Low | Planned. |
| 20 | **Aid verification ledger.** Prevent duplicate distribution claims with auditable handoffs. | Signed append-only local events, conflict review, Base Camp reconciliation, and optional later interoperability adapter. | “Verification pending” state and an audit timeline. A blockchain is not required for the first implementation. | Hard | Medium | Low | Planned. |
| 21 | **Accessible incident mode.** Large controls, high contrast, voice guidance, and reduced motion. | Persist accessibility preferences locally; reuse theme provider and native accessibility APIs. | One-handed alert actions, screen-reader labels, optional spoken summaries, and no reliance on color alone. | Medium | High | High | Partially supported; expansion planned. |
| 22 | **Offline language packs and pictograms.** Communicate common emergency actions across languages. | Versioned local phrase packs, message templates, locale selection, pictogram metadata, and courier-distributed updates. | Source-language label, manual language choice, and “translation pack unavailable” state. | Medium | High | Low | Planned. |

## Top-five critical data flows

### 1. Multi-level alert lifecycle

```text
[Authorized publisher] --reviewed payload + header--> [Controlled alert API]
                                                   | validates, bounds, idempotent save
                                                   v
                                          [disaster_alerts storage]
                                                   |
                                                   v
[Local alert service] <--- list / local creation -- [Alerts Dashboard]
       | durable local save              |         | active / acknowledged / expired
       | optional native notification    |         |
       +----> [Audit event] <------------+         +--> [Local acknowledgement timestamp]
```

### 2. Resource request and courier handoff

```text
[Shelter inventory] -> [Low-stock rule] -> [Local resource request]
                                                  |
                                                  v
                                         [Encrypted outbox / audit]
                                                  |
                    eligible nearby route -------+-------> [Courier device]
                                                           |
                                                           v
                                                    [Base Camp reconciliation]
                                                           |
                                             authenticated receipt / conflict result
```

### 3. Consent-based location report

```text
[Operator chooses precision + expiry] -> [Encrypted location record]
                                             |                |
                                             |                +--> [Local revoke / expiry]
                                             v
                                       [Queue or courier relay]
                                             |
                                             v
                                     [Authorized response workspace]
```

### 4. Damage assessment aggregation

```text
[Field form] -> [Local report + optional evidence manifest] -> [Courier queue]
                                                               |
                                                               v
                                                        [Base Camp store]
                                                               |
                                                               v
                                              [Reviewed situation-report draft]
```

### 5. Shelter capacity alert

```text
[Shelter update] -> [Capacity / need threshold] -> [Local alert record]
                                                       |
                                                       +--> [Alert dashboard + optional notification]
                                                       |
                                                       +--> [Courier/Base Camp when route exists]
```

## Key mobile layouts and user flows

### Alert management is the first destination

```text
┌────────────────────────────────────┐
│ airmesh                     menu   │
│ PRIMARY WORKSPACE · ALERT MANAGEMENT│
│ Manage alerts when networks fail.   │
│ [Search alerts                     ]│
│ [All] [Active] [Acknowledged] [...] │
│  02 Active     05 Ack.     01 Exp.  │
│                                    │
│ Critical · safety · controlled      │
│ River rise                          │
│ [Acknowledge locally]               │
├────────────────────────────────────┤
│ Alerts   Response    Chat   Settings│
└────────────────────────────────────┘
```

The default flow is: **open Alerts → search/filter → open status group → acknowledge local record → review timestamp and source**. A user can enable native notifications only through the explicit permission action. No floating overlay or background permission is assumed.

### Resource request flow

```text
Alerts / Response → Resource inventory → Select stock item
→ Set count and urgency → Save locally → Queue for courier
→ Receive authenticated handoff receipt or keep “pending” status
```

### Field assessment flow

```text
Response → Damage assessment → Choose damage level / needs
→ Optional consented location and evidence → Save locally
→ Courier sync → Base Camp review → Situation-report draft
```

### Family-reunification flow

```text
Response → Reunification case → Minimum-necessary record
→ Save encrypted locally → Sync to authorized shelter/Base Camp
→ Review possible match → Human confirmation → Close or retain case
```

## Phased implementation plan

| Phase | Scope | Dependencies | Indicative effort | Suggested team allocation | Exit evidence |
|---|---|---|---|---|---|
| **Phase 1 — Critical** | Multi-level alert policy, inventory/request records, consented location foundation, damage reports, shelter capacity | Alert schema migration, local database versioning, provider governance, transport acceptance plan | 10–16 person-weeks | Mobile 2, backend 1, UX 1, QA/security 1 | Unit/integration tests, migration proof, field workflow test, privacy review. |
| **Phase 2 — High** | Volunteer tasks, medical-resource operations, media/voice messages, reunification, zone packs | Phase 1 models, encrypted attachment design, local map/zone package, role controls | 16–24 person-weeks | Mobile 2, native transport 1, backend/Base Camp 1, product/UX 1, QA 1 | Two-device test evidence, usability test, retention/access controls. |
| **Phase 3 — Medium** | Situation reports, mesh health expansion, supply chain, outbreak aggregates, weather packs, backup/recovery | Courier/Base Camp acknowledgements, conflict resolver, validated import/export | 14–22 person-weeks | Backend/Base Camp 2, mobile 1, data/UX 1, QA/security 1 | Courier/Base Camp acceptance, recovery drill, red-team privacy review. |
| **Phase 4 — Research** | Battery policy, early-warning corroboration, language packs, aid-verification interoperability | Real-device battery study, data governance, regional partners, user research | Discovery-led | Product/research 1, native 1, security 1 | Pilot protocol and go/no-go criteria; no production claim before field validation. |

> Estimates describe implementation effort for a small experienced team; they are not a deployment guarantee. Hardware validation, provider approval, security review, and incident-partner governance can dominate calendar time.

## Dependency order

| First | Then | Why |
|---|---|---|
| Alert source governance, local schemas, audit taxonomy | Multi-level alerts, inventory, capacity, assessments | Every operational feature needs durable provenance and rollback. |
| Two-device native transport acceptance | Courier delivery, receipts, location exchange, media | UI/protocol foundations do not prove physical delivery.[2] |
| Consent, role, retention, and encryption design | Medical, reunification, location, outbreak information | Sensitive data must be minimized before sync/aggregation. |
| Conflict-resolution and receipt semantics | Supply chain, backup/recovery, Base Camp summaries | These features require trustworthy handoff states. |

## Demo scripts and fallback plans

| Demo | Steps | Success signal | Fallback if a peer or provider is unavailable |
|---|---|---|---|
| **Alert triage** | Create a local test alert; use the dashboard to search, filter Active, and acknowledge it. | Record moves to Acknowledged with a local timestamp. | Use local alert only; do not claim external source or device-tray notification. |
| **Shelter capacity request** | Create a structured local shelter report with people, needs, and urgency; show courier queue. | Local report persists and has a truthful local/queued state. | Demonstrate queue/audit state, not a fabricated courier acceptance. |
| **Damage assessment** | Create a sample low-risk training assessment; save locally; display audit event. | Local durable record and audit entry appear. | Use a synthetic training record, clearly labeled, with no real person/location data. |
| **Mesh diagnostics** | Open Diagnostics, search a route/peer identifier, export a redacted support bundle. | Observed topology/queue values and export status appear. | Use an empty observed state and explain that no peer is connected. |
| **Controlled publisher** | In an authorized staging deployment, ingest a reviewed test alert and show it locally. | Stable alert ID appears once and can be acknowledged locally. | Do not demonstrate without a configured authorized publisher; show the service-unavailable boundary instead. |

## Release gates for future feature work

Before a feature is labelled operational, it should pass its relevant gate: database migration/rollback test, offline restart test, transport and receipt test where data leaves the device, permission/consent test where sensors are used, audit review for sensitive actions, and physical Android validation for notifications or radio behavior. The existing native mesh boundary is not enough to claim peer-to-peer delivery, relay, or distance until two- and three-device tests pass.[2]

## References

[1] [Controlled Alert Ingestion and Local-first Boundaries](controlled-alert-ingestion.md)

[2] [Offline Mesh Architecture Gap Report](pasted-architecture-gap-report.md)
