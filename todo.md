# Project TODO

- [x] Air-Mesh brand palette and triangle logo configuration
- [x] Mobile design plan and screen inventory
- [x] Theme system with dark default, light override, and system preference support
- [x] Zustand UI stores for chats, contacts, reports, settings, and theme
- [x] Reusable Button, Card, Input, Avatar, StatusBadge, MessageBubble, ProgressBar, BottomSheet, EmptyState, and RangeIndicator components
- [x] Four-tab navigation for Home, Messages, Rescue, and Settings
- [x] Home dashboard with mesh range indicator, summary cards, SOS feedback, recent activity, and drawer
- [x] Messages chat list with search, unread badges, relay-aware previews, and new-chat flow
- [x] Chat screen with relay status, mock messages, delivery ticks, attachment sheet, composer, and SOS feedback
- [ ] New group creation screen with contact multi-select
- [x] Contacts and nearby mesh devices screen with range, role, distance, and signal indicators
- [ ] Add contact screen with QR identity display and manual entry mock flow
- [x] Rescue menu with Shelter Mode, Courier Mode, and Reports entry points
- [x] Shelter report form with needs, severity, validation, save feedback, and navigation
- [x] Courier sync screen with device list, progress state, and sync-all feedback
- [x] Reports list with filters and synchronization states
- [x] Settings screen with profile, role, connectivity toggles, appearance, security, audit log, and about links
- [x] Profile screen with editable identity, role/status controls, device ID, and public-key QR
- [x] Audit log and About screens
- [x] README setup instructions and mock-data replacement guidance
- [x] TypeScript, lint, and test verification
- [x] Final visual and navigation polish

- [x] Make light/dark mode system-aware and explicit-toggle aware across app chrome and status bar
- [x] Inspect and synchronize the complete Air-Mesh codebase to the requested GitHub repository
- [x] Verify the synchronized repository and updated theme behavior

- [x] Add Rust base-camp backend project under base-laptop
- [x] Implement serde models for reports, audit logs, and prioritized actions
- [x] Implement SQLite schema, upserts, retrieval, and latest-insights storage
- [x] Implement HTTP sync, reports, insights, and audit endpoints
- [x] Implement Ollama prioritization with mock-AI fallback and configuration
- [x] Implement dashboard static-file serving with SPA fallback
- [x] Add backend README, fixtures, and offline-friendly verification
- [x] Run Rust formatting, tests, and build verification

- [x] Remove misleading fake live/demo claims and label mock data honestly
- [x] Add offline-first local account setup and persistence
- [x] Add user-configurable accent/theme colors constrained to accessible Air-Mesh-compatible palettes
- [x] Add Android permission request flow with web/iOS-safe fallbacks
- [x] Detect device/platform identity and show a truthful local device status
- [x] Test onboarding, theme customization, permissions, device status, and core tabs
- [x] Push the complete updated project to GitHub

- [x] Add carefully selected web-sourced visual assets with local copies and attribution notes
- [x] Make permission requests explicit in onboarding and Settings, with Android rationale and denied/unsupported states
- [x] Add TypeScript mesh service interfaces and development-build transport boundary
- [x] Add BLE chunking, message deduplication, TTL routing, and routing-table helpers
- [x] Add courier report sync service interface with BLE-first and local HTTP fallback
- [x] Add service documentation and release preparation notes
- [x] Verify the new app/service behavior and synchronize to GitHub
- [x] Prepare GitHub release metadata; APK binary requires the managed mobile build/release flow
