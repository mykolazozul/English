# English Flow v2.5.0 — release report

## Goal
Prepare the product for external security, UI, logic, database and online/realtime testing.

## Changed
- Fixed endless lesson preparation and explicit session-expiry handling.
- Removed PWA/offline runtime completely.
- Admin 2.0: first-admin bootstrap, role permissions, TOTP 2FA, WebAuthn/passkeys, admin session metadata and audit.
- Chat Security 2.0: multi-device keys, fingerprint trust, key-change warning, key rotation, device revoke, E2E v2, encrypted attachments and content integrity hash.
- Realtime accepts only encrypted E2E v2 chat envelopes.
- Custom themed scrollbar.
- Security Lab + Playwright E2E suite.
- Updated AI context, changelog, roadmap and database instructions.

## Automatic checks completed in this build
- `node scripts/audit-static.mjs` — PASS, 61 source files.
- `node scripts/security-lab.mjs` — PASS, 56 source files.
- Server/API/realtime/scripts `node --check` — PASS.
- No native `alert/confirm/prompt` — PASS.
- No native `<select>` — PASS.
- No service worker/PWA runtime — PASS.
- No PWA files — PASS.
- No client XP profile write — PASS.
- No plaintext chat insert — PASS.
- HARD mode no full-catalog fallback — PASS.

## Page/component QA coverage
1. Home — dashboard stats, animated emoji, daily goal, version, no Notion metadata.
2. Learn — mode selection, direction, category and lesson entry.
3. Lesson — protected session, numbering, answer flow, XP/SRS hooks, timeout/error state.
4. Vocabulary — search/filter, word cards and custom controls.
5. SRS — due-card selection and empty state.
6. Statistics — metrics/charts/animated emoji.
7. Badges — earned/locked presentation and test badge UI.
8. Problem Words — only evidence-backed problem words; empty state when none.
9. Leaderboard — server-backed ranking/privacy.
10. Friends — friend requests, privacy, block/report, E2E device state.
11. Chat — E2E v2, fingerprints, key change warning, multi-device, encrypted attachments, realtime/HTTP fallback.
12. Challenges — create/join/score and access rules.
13. Settings — themes, sounds, comparison, privacy.
14. RPG Profile — XP/level/avatar/progression.
15. About — current version, changelog, realtime status/ping; no PWA controls.
16. Admin — authentication, role boundaries, 2FA/passkeys, Notion sync, users, reports, monitoring, analytics and audit.

## Manual/real-environment tests still required
- Execute Neon `schema-v5.sql`, `schema-v6.sql`, `schema-v7.sql`, `schema-v8.sql` in the real database.
- Verify the real `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `NOTION_TOKEN`, `SYNC_SECRET` and WebAuthn origin settings.
- Run Vite production build and Vercel Preview/Production deployment.
- Test with two real user accounts and two browsers/devices.
- Test E2E chat after key rotation and device revoke.
- Test encrypted attachment send/decrypt on the recipient device.
- Test realtime reconnect and ping against the real WebSocket service.
- Test admin bootstrap, TOTP login and passkey login.
- Test mobile Safari/Chrome and responsive layouts.
- Run the guarded Security Lab against staging only.

## Known limitations
- Passkeys require WebAuthn environment variables and browser support.
- TOTP secret is displayed once during setup; store it in the authenticator before enabling.
- E2E attachment UI currently limits files to 2 MB.
- E2E trust is local per peer fingerprint; a future version can add explicit cross-device verified identity chains.
- The current product remains online-only by design.

## Recommended next release ideas
- WebAuthn/passkey management page with rename/remove and recovery codes.
- Signal-style verified identity chain and key transparency log.
- Automated visual regression screenshots for desktop/tablet/mobile.
- DB migration health endpoint in Admin.
- Background Notion sync status history with diff preview before publishing.
- Challenge live standings and scheduled notifications.
- Admin action approval workflow for destructive operations.
