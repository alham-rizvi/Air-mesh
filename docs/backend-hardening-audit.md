# Backend Hardening Audit

**Scope.** This audit covers the Air-Mesh Express/tRPC backend, controlled alert ingestion, server database helpers, local durable alert service, cookie handling, and web-memory database behavior as of the v1.5.1 hardening pass.

| Area | Issue addressed | Implemented control |
|---|---|---|
| Controlled alert publisher | Publisher secret was accepted in a request payload, where it could be unintentionally captured by client telemetry or request logging. | The secret is now accepted only through `X-AirMesh-Publisher-Token`; mobile code never stores or sends it. |
| Controlled alert retries | A repeated stable publisher ID caused a duplicate-key failure rather than an idempotent update. | Server storage uses a duplicate-key update for the alert’s mutable publisher fields. |
| Degraded server storage | A missing database returned an empty server-alert array, which could resemble a healthy empty feed. | The listing route now returns `SERVICE_UNAVAILABLE`; the health endpoint reports database configuration and availability. |
| Ingestion validation | Whitespace-only values were accepted by minimum-length validation. | IDs and text fields are trimmed and bounded before any storage call; invalid expiry ordering is rejected. |
| Local alert presentation | A subscriber exception could reject a create flow after the alert was already saved. | Each subscriber is isolated; a presentation failure is logged without invalidating durable persistence. |
| Local acknowledgement | A nonexistent alert could be audited as acknowledged. | The service verifies the local record and rejects a missing acknowledgement target. |
| Cookie behavior | Missing request hosts caused logout to throw; insecure local cookies used `SameSite=None`. | Host parsing is defensive; HTTPS uses `SameSite=None; Secure`, while local HTTP uses host-only `SameSite=Lax`. |
| Server exposure | CORS reflected every requesting origin and request parsers accepted 50 MB bodies. | CORS now allows configured, Manus, and localhost origins only; body parsing is limited to 1 MB. |
| Web-memory state | Callers could mutate saved chat, contact, or audit values returned by the memory database. | Returned values are copied before exposure. |
| Publisher clock abuse | A controlled publisher could submit an implausibly future-dated alert that would remain top-ranked in the feed. | The ingest route rejects issue times more than five minutes ahead of server time before storage. |

## Verification evidence

The regression suite covers publisher-header authorization, input trimming and rejection, controlled-service degradation, local alert validation, listener isolation, missing acknowledgement handling, and cookie behavior across missing host, local HTTP, and deployed HTTPS cases. The full project suite must remain the release gate because it also validates the Android manifest/preflight and Rust Base Camp.

## Remaining operational boundaries

Air-Mesh does **not** claim a configured official alert feed, an always-on background server-push path, or hardware-verified Bluetooth/Wi-Fi Direct delivery. A deployment owner must operate an authorized publisher, hold the publisher secret outside the app, and monitor the `/api/health` endpoint. Notification-tray behavior, nearby transport, Android Settings handoff, background scheduling, and multi-device relay/receipt paths still require installed-APK field acceptance on real devices.
