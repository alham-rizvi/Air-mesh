# Air-Mesh Mobile Interface Design

## Product direction

Air-Mesh is an offline-first coordination tool for messaging and rescue operations when conventional internet connectivity is unavailable. The interface is designed for fast one-handed use in stressful conditions: clear hierarchy, large touch targets, restrained color, predictable native navigation, and immediate feedback for every action.

The visual language follows mainstream iOS conventions while remaining comfortable on Android: portrait-first layouts, safe-area-aware content, native stack transitions, compact top bars, bottom tabs for primary destinations, and sheets or alerts for secondary actions.

## Screen list

| Area | Screen | Primary content and functionality |
|---|---|---|
| Home | Home | Mesh reachability summary, 2x2 status cards, SOS action, recent activity, drawer access |
| Messages | Chat list | Searchable conversation list, relay-aware previews, unread states, new-chat FAB |
| Messages | Chat | Relay status, message history, delivery ticks, pill composer, attachment sheet, SOS action |
| Messages | New group | Group name, contact multi-select, create group action |
| Messages | Contacts | Known contacts, nearby mesh devices, range indicator, role and signal information |
| Messages | Add contact | QR identity card, scanner placeholder action, manual device ID entry |
| Rescue | Rescue menu | Shelter Mode, Courier Mode, and View Reports entry cards |
| Rescue | Shelter report | Shelter report form, urgent-need selection, severity control, save confirmation |
| Rescue | Courier sync | Nearby relay devices, per-device sync, progress feedback, sync-all action |
| Rescue | Reports | Filterable local report cards, severity and synchronization status |
| Settings | Settings | Profile, role, connectivity toggles, theme override, security, audit log, about |
| Settings | Profile | Avatar, editable display name, role/status controls, device ID, public-key QR |
| Settings | Audit log | Chronological local activity records and action filter |
| Settings | About | Triangle brand mark, app identity, version, description, licenses |

## Layout and navigation

The app uses four bottom tabs: Home, Messages, Rescue, and Settings. Each tab owns a stack through Expo Router. Home and Messages include a hamburger action that opens a compact drawer containing recent activity, quick shortcuts, and the current relay overview. Detail screens use a native-style back affordance and preserve the originating tab context.

All primary actions are reachable within the lower half of the screen where practical. Lists use generous row heights, strong section labels, and full-row hit targets. Forms place the most important action at the bottom of the scroll content and keep field labels visible above controls.

## Key user flows

### Send a mesh-relayed message

1. The user opens Messages and selects a conversation.
2. The Chat screen shows the contact name and a relay status line such as “Via 2 relays · ~500m reachable.”
3. The user types in the fixed pill composer and taps the green send control.
4. The new message appears on the right with a delivery tick and mock relay metadata.
5. The user can tap the paperclip to open Image, File, and Voice Note options; unsupported options return a clear “Coming soon” message.

### Broadcast SOS

1. The user taps the SOS control on Home or Chat.
2. A confirmation alert explains that the broadcast is simulated for this frontend foundation.
3. On confirmation, a success alert states that the SOS was sent to nearby devices and the activity feed records the event.

### Create a shelter report

1. The user opens Rescue and chooses Shelter Mode.
2. The report form presents shelter ID and timestamp as read-only context.
3. The user enters the waiting count, chooses urgent needs, adds notes, and selects Low, Medium, or High severity.
4. The user taps Save Report, receives success feedback, and returns to the Rescue menu.

### Sync reports through a courier

1. The user opens Rescue and chooses Courier Mode.
2. Nearby shelter and base devices appear with role badges and signal indicators.
3. The user taps Sync on one device or Sync All.
4. A progress state communicates the mock transfer count before displaying Sync complete.

### Change appearance

1. The user opens Settings and finds Appearance.
2. The theme control toggles between the system default and explicit dark/light presentation.
3. The entire palette updates without changing the layout or accent semantics.

## Color choices

The brand is intentionally monochrome with one operational accent. Dark mode uses `#000000` for the app background, `#1E1E1E` for surfaces, `#FFFFFF` for primary text, `#A0A0A0` for secondary text, and `#333333` for borders. Light mode uses `#F5F5F5` for the background, `#FFFFFF` for surfaces, `#000000` for primary text, `#666666` for secondary text, and `#DDDDDD` for borders. Both modes use Air-Mesh green `#10A37F` for active navigation, relay reachability, online indicators, unread badges, send controls, and SOS emphasis.

The accent is used sparingly so that green consistently means “active, reachable, selected, or actionable.” Severity uses the same monochrome foundation rather than introducing extra colors; High severity is communicated through stronger weight and border treatment.

## Component language

Reusable components include `Button`, `Card`, `Input`, `Avatar`, `StatusBadge`, `MessageBubble`, `ProgressBar`, `BottomSheet`, `EmptyState`, and `RangeIndicator`. Cards are flat and border-led, never shadowed or gradient-filled. Message bubbles are borderless: sent messages use the green accent with white text, while received messages use the current surface with primary text. Icons use Material Icons in the approved monochrome palette and never rely on emoji.

## Accessibility and interaction details

The app uses system fonts, portrait orientation, large touch targets, visible focus/pressed states, readable contrast, and labels for icon-only actions. Empty states explain what the user can do next. Mock actions always provide feedback so the hackathon demo feels complete without implying that networking or persistence is already implemented.
