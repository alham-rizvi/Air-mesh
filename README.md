# Air-Mesh

Air-Mesh is an Expo React Native frontend foundation for offline-first peer-to-peer messaging and rescue coordination. This implementation is intentionally frontend-only: all conversations, nearby nodes, relay paths, reports, and sync states use local mock data so the interface can be demonstrated before Bluetooth, Wi-Fi Direct, or persistent storage are connected.

## Run locally

Install dependencies with `pnpm install`, then start the Expo development server with `pnpm dev:metro` or `pnpm start`. The project targets Expo SDK 54 with TypeScript and Expo Router. `pnpm check` runs TypeScript validation and `pnpm lint` runs the Expo ESLint configuration.

## Included experience

The app uses four primary modules: Home, Messages, Rescue, and Settings. Home emphasizes the mesh relay value proposition with a `~500m reachable` indicator, nearby peer counts, relay-aware recent activity, and SOS feedback. Messages includes a searchable chat list, relay status in chat, mock delivery ticks, a pill composer, attachment and voice-note feedback, contacts, and nearby-device signal indicators. Rescue includes shelter reports, courier sync progress, report filters, severity, and synchronization state. Settings includes role selection, connectivity toggles, dark/light mode, profile, audit log, and About screens.

The design system follows the requested constraints: black or `#F5F5F5` backgrounds, `#1E1E1E` or white surfaces, monochrome text and borders, and the restrained Air-Mesh green accent `#10A37F`. The triangle mark is used in the About screen and the generated launcher icon is copied into the Expo asset slots.

## Replace mock data later

Mock data and UI state are centralized in `lib/air-mesh-store.ts`. Replace the arrays for chats, messages, contacts, and reports with adapters for the eventual mesh transport and local persistence layer. The store action `addMessage` is the seam for sending a message, while `addReport` is the seam for saving a report locally. Keep relay metadata (`Direct`, `Via N relays`, or `Unavailable`) in the domain objects so the UI can continue to explain how a message reached its destination.

The next integration layer should expose transport events rather than letting screens call Bluetooth or Wi-Fi APIs directly. A transport adapter can publish nearby-device discovery, delivery acknowledgements, relay-hop counts, and sync progress into the Zustand stores. Local persistence can be added with AsyncStorage or a device database without changing the screen contracts.

## Project notes

The main demo surface is `app/(tabs)/index.tsx`. It contains the screen-level flows and reusable primitives needed for this frontend foundation. The initialized template's server and database capabilities remain unused because the brief requested mock frontend data and no real networking or database integration.
