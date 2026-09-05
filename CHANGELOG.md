# English Flow / Flov — changelog

## v2.5.0 — Security & QA release
- Removed PWA/offline mode completely. The product is intentionally online-only.
- Fixed endless lesson preparation: empty HARD/SRS pools now show a useful state; lesson requests have a hard timeout; 401 is treated as session expiry.
- Added global authenticated-session recovery so stale Neon sessions no longer create endless `Unauthorized` loops.
- Admin 2.0: first-admin bootstrap using server-only `ADMIN_PASSWORD`, admin/moderator permission boundaries, session metadata, TOTP 2FA enrollment and audit events.
- Chat Security 2.0: multiple devices, key versions, revoke device, fingerprint trust, key-change warning, E2E v2 envelope, encrypted attachments (2 MB), AES-GCM integrity and message content hash/versioning.
- Realtime chat validates every recipient device key and never accepts plaintext chat payloads.
- Added Playwright E2E suite and guarded Security Lab for auth, brute-force/rate-limit, session expiry, privilege escalation, XSS, CSRF, IDOR and API fuzzing.
- Added custom scrollbar styling and kept native-looking controls out of the application UI.
- Updated AI context/release documentation so future AI changes preserve architecture and reporting rules.

## v2.4.0
- P-256 E2E chat foundation and encrypted Neon message storage.
- Admin/Stats recovery after session expiry.

## v2.3.0
- Learning Engine stabilization, protected lesson sessions and server-side answer verification.
- Safe Notion sync and admin-only sync metadata.
- Realtime status + ping, custom modals/dropdowns and admin test themes.
- RPG profile and animated emoji feedback.

## v2.2.2
- Vercel Hobby gateway: 25 API handlers behind one Serverless Function.

## v2.2.1
- Static security audit fix for Windows paths and dependency lock updates.

## v2.2.0
- Product & Learning Analytics 1–17, retention, SRS, vocabulary, social, security and system monitoring.

## v2.1.0
- Production Neon architecture, server-authoritative progress, friends, challenges, chat, privacy, reports and admin audit.

## v2.0.0
- Neon application source of truth, idempotent progress, lesson sessions, anti-cheat limits and persistent achievements.

## v1.8-beta
- Vercel + Neon, Notion → Neon sync, cloud profile sync and current vocabulary lessons.

## v1.6-beta → v0.6-beta
- Historical UI, gameplay, SRS, badges, themes, analytics and deployment milestones preserved from previous releases.
