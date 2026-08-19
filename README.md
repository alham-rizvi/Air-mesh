# Air-Mesh

Air-Mesh is an Expo React Native frontend with an offline-first local identity flow, honest empty states, configurable appearance, and a transport-agnostic mesh service layer. Real conversations, nearby nodes, relay paths, reports, and sync states remain unavailable until a native transport and persistence adapter are connected; the app does not invent live peers.

## Run locally

Install dependencies with `pnpm install`, then start the Expo development server with `pnpm dev:metro` or `pnpm start`. The project targets Expo SDK 54 with TypeScript and Expo Router. `pnpm check` runs TypeScript validation and `pnpm lint` runs the Expo ESLint configuration.

## Included experience

The app uses four primary modules: Home, Messages, Rescue, and Settings. Home emphasizes the mesh relay value proposition with a `~500m reachable` indicator, nearby peer counts, relay-aware recent activity, and SOS feedback. Messages includes a searchable chat list, relay status in chat, mock delivery ticks, a pill composer, attachment and voice-note feedback, contacts, and nearby-device signal indicators. Rescue includes shelter reports, courier sync progress, report filters, severity, and synchronization state. Settings includes role selection, connectivity toggles, dark/light mode, profile, audit log, and About screens.

The design system follows the requested constraints: black or `#F5F5F5` backgrounds, `#1E1E1E` or white surfaces, monochrome text and borders, and the restrained Air-Mesh green accent `#10A37F`. The triangle mark is used in the About screen and the generated launcher icon is copied into the Expo asset slots.

## Replace mock data later

Mock data and UI state are centralized in `lib/air-mesh-store.ts`. Replace the arrays for chats, messages, contacts, and reports with adapters for the eventual mesh transport and local persistence layer. The store action `addMessage` is the seam for sending a message, while `addReport` is the seam for saving a report locally. Keep relay metadata (`Direct`, `Via N relays`, or `Unavailable`) in the domain objects so the UI can continue to explain how a message reached its destination.

The transport boundary is now defined under `mobile/src/services/`. It includes the Air-Mesh BLE UUIDs, 512-byte message/file chunking, message deduplication, TTL-limited forwarding, lower-hop routing-table merges, courier sync contracts, voice permission helpers, and an injectable BLE adapter contract for a native development build. Expo Go and web intentionally use an unavailable/mock transport.

During first account setup, the app explains why nearby-device permissions are needed before Android requests are shown. Users can choose Not now and retry from Settings. The selected mesh topology reference image and its source notes are documented in `docs/web-assets.md`. `.github/workflows/android-release.yml` builds and attaches an APK to a GitHub Release when dispatched or triggered by a version tag; the APK is not manually compiled in the sandbox.

## Project notes

The main demo surface is `app/(tabs)/index.tsx`. It contains the screen-level flows and reusable primitives needed for this frontend foundation. The initialized template's server and database capabilities remain unused because the brief requested mock frontend data and no real networking or database integration.
