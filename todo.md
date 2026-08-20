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
- [x] New group creation screen with contact multi-select
- [x] Contacts and nearby mesh devices screen with range, role, distance, and signal indicators
- [x] Add contact screen with QR identity display and manual entry mock flow
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

- [x] Generate and commit the Android native project directory
- [x] Verify AndroidManifest.xml and native permissions are present
- [x] Add or document the native BLE development-build dependency boundary
- [x] Add Android build/run documentation and generated-file caveats
- [x] Verify native generation and synchronize Android files to GitHub

- [x] Add shared security and data TypeScript interfaces
- [x] Implement SQLite schema, migrations, CRUD, and mock in-memory database mode
- [x] Implement AES-GCM/ECDH crypto service boundary with native and mock adapters
- [x] Implement local contact pairing and public-key identity helpers
- [x] Implement audit logging service and integration seams
- [x] Add database schema documentation and README setup guidance
- [x] Add encryption and database CRUD tests
- [x] Verify all checks and push the complete update to GitHub

- [x] Verify exact AndroidManifest.xml path in the local and GitHub native projects
- [x] Push any pending Air-Mesh changes to GitHub and verify the remote commit

- [x] Verify Android native paths through the GitHub remote tree/API
- [x] Correct any missing Android native files in the GitHub repository
- [x] Verify clickable remote links for AndroidManifest.xml and the Android project directory

- [x] Audit frontend, mesh, security/database, backend, native Android, and GitHub interfaces
- [x] Connect encrypted message send/receive seams with database persistence and audit logging
- [x] Connect routing-table persistence, mesh status, SOS broadcast, and report courier sync seams
- [x] Add retry, corruption, duplicate, disconnection, and cleanup safeguards
- [x] Add integration/unit tests and manual device test documentation with actual limitations
- [x] Add architecture, demo, testing, and release documentation
- [x] Reconcile every local source line with GitHub main and verify the remote tree

- [x] Audit Android SDK, Java, Gradle, Expo, and native project prerequisites
- [x] Prepare reproducible Android environment checks and development-build scripts
- [x] Verify manifest, permissions, BLE/dev-client configuration, and release workflow without sandbox APK compilation
- [x] Push final environment documentation/configuration to GitHub main

- [x] Re-run complete Android toolchain and release-build preflight for the expanded APK request
- [x] Attempt the supported release APK build path and capture the resulting artifact or exact environment blocker
- [x] Complete New Group creation flow with contact multi-select
- [x] Complete Add Contact flow with QR identity and manual entry
- [x] Push all expanded-task changes and verification results to GitHub main

- [x] Run the complete automated verification suite before finalizing the comprehensive development-stage Markdown plan
- [x] Create a full remaining-work plan covering implementation, native Android, backend, security, mesh transport, device testing, release, and GitHub verification
- [x] Finalize and synchronize the comprehensive Markdown plan after verification passes

- [x] Audit the post-APK repository and identify every remaining implementation or environment gap
- [x] Set up reproducible local Rust, Android, Expo, and release verification commands
- [x] Complete any remaining frontend, native, transport, backend, security, and documentation gaps that are implementable in the sandbox
- [x] Run the complete automated suite and verify the published APK/release state
- [x] Push all final changes and update the remaining-work documentation

- [x] Audit logout, options/settings, and audit-log handlers and reproduce each broken interaction
- [x] Repair logout reset behavior, options/settings navigation, and audit-log loading/empty/error states
- [x] Add focused Air-Mesh quality-of-life features that are locally verifiable
- [x] Extend automated coverage for repaired flows and new features
- [x] Run interactive preview checks and the complete verification suite
- [x] Push the tested fixes and feature improvements to GitHub main

- [x] Audit remaining dead buttons, placeholder alerts, runtime warnings, and visual friction points
- [x] Repair high-impact non-working interactions and improve loading, empty, error, and success feedback
- [x] Add a detailed in-app FAQ and helpful offline/permission/troubleshooting guidance
- [x] Add focused UI polish and one or more practical Air-Mesh quality-of-life features
- [x] Expand automated coverage and run full verification plus preview checks
- [x] Push the debugged and polished result to GitHub main

- [ ] Push the latest verified Air-Mesh code to GitHub main for the release build
- [ ] Dispatch and monitor a new Android APK release workflow
- [ ] Verify the published release entry and APK asset
