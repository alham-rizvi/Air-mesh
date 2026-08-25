# Air-Mesh UI/UX Redesign

## Product Direction

Air-Mesh becomes a **calm emergency-operations workspace**, not a collection of generic cards. The interface must make the immediate situation clear in seconds: whether alerts require attention, whether local coordination is available, and which response action is appropriate. It retains truthful local-first language and never presents an unavailable provider, shelter, route, or peer as live.

The experience is optimized for a **9:16 portrait viewport** and thumb-reachable use. A near-black operational canvas, soft graphite layers, warm-white copy, and disciplined signal-teal accents are paired with subtle route lines and node clusters. This creates an ownable mesh-coordination motif without distracting from emergency information.

## Visual System

| Element | Decision |
| --- | --- |
| Background | `#070909` black-green canvas for focus and battery-friendly OLED presentation. |
| Surfaces | `#101513` command surfaces and `#151C19` raised sheets and fields. |
| Text | `#F4F7F3` primary, `#AAB5AF` secondary, and `#6F7C75` tertiary metadata. |
| Signal color | `#2DD4BF` for verified local readiness, selection, and direct action only. |
| Attention | `#F4B860` caution, `#FF6B6B` critical, and `#8FA7FF` informational; none imply an external source. |
| Typography | Archivo Expanded for compact operational labels and headings; a system sans for dense body copy. |
| Geometry | 16–22 px radii, 1 px low-contrast borders, 48 px minimum touch targets, and 20 px screen margins. |
| Motion | 120–220 ms opacity and scale feedback. No decorative looping motion beyond a restrained bootstrap signal. |

## Screen List

| Screen | Primary content and functionality |
| --- | --- |
| Bootstrap | Brand mark, operational promise, and a non-blocking local initialization indicator. |
| Local identity setup | On-device identity explanation, name input, device status, and one clear continue action. |
| Alert Command | Primary destination with operational bar, alert state summary, local-readiness disclosure, and dashboard access. |
| Alerts Dashboard | Search, urgency and state filters, clear alert rows, and visible local acknowledgement. |
| Response | Safety check-in, nearby rescue request, user-initiated 112 handoff, hazard selector, guides, and provider readiness. |
| Chat | Conversation list and thread centered on truthful queued, accepted, and delivered states. |
| Settings | Identity, nearby transport, alert preferences, diagnostics, accessibility, and support links in clear operational groups. |
| Detail surfaces | Contacts, discovery, reports, diagnostics, profile, audit, and FAQ retain working actions within the shared hierarchy. |

## Navigation and Interaction

The bottom navigation is ordered **Alerts**, **Response**, **Chat**, and **Settings**. Alerts remains primary and Chat remains second-to-last. Every destination has an explicit textual label and selected signal-teal indicator; no primary action relies on an unlabeled icon.

The top bar is compact and task-based. Back navigation appears only in nested workspaces. Every action has a pressed state and every asynchronous local action communicates pending, success, or failure. Empty states explain what is missing, why it is unavailable, and the next valid action without manufacturing operational data.

## Key User Flows

| Flow | Steps |
| --- | --- |
| Review an alert | Open Alerts → review active state → filter or search → review the row → acknowledge locally. |
| Coordinate response | Open Response → choose hazard → record safe status or nearby rescue request → optionally tap Call 112 to open the dialer. |
| Send local message | Open Chat → select conversation → write message → send → see queued, accepted, or delivered feedback. |
| Enable nearby transport | Open Settings → read rationale → enable supported permissions → return to discovery or diagnostics. |
| Understand unavailable services | Open Response → Provider readiness → review explicitly unconfigured channels and authorization needs. |

## Accessibility and Quality Bar

Controls meet a 48 px touch target where feasible, keep readable contrast, expose accessibility labels and state, avoid color-only status signals, and use clear non-alarmist language. Important safety actions are never hidden behind gestures or long presses. The redesign preserves functional state, persistence, routes, and verified backend boundaries while replacing visual composition, hierarchy, and interaction feedback.
