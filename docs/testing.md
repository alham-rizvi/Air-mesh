# Air-Mesh QA Test Matrix

## Automated verification

| Area | Command or suite | Result |
|---|---|---|
| TypeScript integration | `pnpm check` | Passed |
| Lint | `pnpm lint` | Passed with the repository's existing module-type warning only |
| Frontend state | `tests/air-mesh-state.test.ts` | 3 passed |
| Mesh protocol | `tests/mesh-protocol.test.ts` | 3 passed |
| Security/data | `tests/security-data.test.ts` | 3 passed |
| Integration facade | `tests/integration-service.test.ts` | 2 passed |
| Existing auth suite | `tests/auth.logout.test.ts` | Skipped by existing test setup |

## Manual cases

| Case | Setup | Expected result | Sandbox status |
|---|---|---|---|
| Direct encrypted message | Two Android development builds, airplane mode, Bluetooth on | Pair, encrypt before send, decrypt on receive, persist both envelopes, write audit events | Service-level automated coverage; physical device run required |
| Three-device relay | A and C out of range, B between them | TTL-limited forwarding, deduplication, routing table update, relay audit event | Protocol coverage; physical BLE run required |
| Group chat | Three paired identities | One group envelope delivered to direct and relayed members | UI/service integration pending dedicated group route |
| SOS | Nearby development builds | Emergency broadcast envelope and `sos_triggered` audit event | Service-level coverage; physical BLE run required |
| Shelter/courier/base | Rust server and two development builds | Local report, courier pull, `/sync`, base insight, status transition | Rust API available; physical courier flow required |
| Theme persistence | Any supported platform | Light/dark/system and accent choices persist after restart | Covered by existing state/UI verification |
| Permission denial | Android development build | Clear rationale, denied state, Settings retry, no fake discovery | Implemented; physical Android permission prompt required |
| Corrupt/duplicate frames | Protocol fixture | Invalid checksum/shape rejected and duplicate IDs ignored | Automated protocol coverage |

## Acceptance boundary

The current project has deterministic automated coverage and an honest mock/unavailable path. It does not claim that physical two- or three-phone BLE behavior has been executed in the sandbox. That final acceptance step requires Android development builds, real devices, Bluetooth enabled, and a human-run test session.
