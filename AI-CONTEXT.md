# AI CONTEXT — English Flow / Flov

## Mandatory rule
Before changing this project, read this file, `ARCHITECTURE.md`, `SECURITY.md`, `CHANGELOG.md`, `ROADMAP.md` and the latest `RELEASE-AUDIT-*` / `QA-CHECKLIST-*` files. After a release, update version strings, changelog, AI context and release audit.

## Current release
**v2.5.0 — Security & QA release**.

## Architecture
- Neon PostgreSQL is the authoritative source of truth for authenticated application state.
- Notion is the vocabulary/content source, never the player-progress source.
- Vercel hosts the web app and one API gateway function; legacy `/api/*` URLs remain stable through rewrites.
- Realtime is a separate long-running WebSocket service. It authenticates against Neon and uses Neon LISTEN/NOTIFY for cross-instance chat fan-out.
- The product is intentionally ONLINE-ONLY. Do not re-add PWA, service-worker, offline page, offline progress queue, or offline XP/SRS behavior unless the owner explicitly asks.
- IndexedDB/localStorage may cache UI/profile/device crypto state, but never becomes authoritative for authenticated XP/SRS/lessons.

## Learning rules
- Learning Engine selects lesson words server-side.
- `lesson_sessions.lesson_words` freezes the exact set for a protected lesson.
- Server verifies submitted answers and calculates XP/SRS.
- HARD / Problem Words means only words with real evidence of problems; never fall back to the whole dictionary.
- A word is problem-worthy only when the current policy says it has meaningful errors (currently >=2 wrong and wrong > correct).
- If there are no problem words, show a clear empty state — never endless loading.
- Notion count/timestamp is ADMIN-ONLY; never expose it on the first/home page.

## Auth/session rules
- Normal session: `__Host-ef_session`, HttpOnly, Secure, SameSite=Strict.
- Admin session: `__Host-ef_admin`, HttpOnly, Secure, SameSite=Strict, bound to the logged-in Neon user and expiring.
- Any authenticated API 401 must terminate the stale authenticated UI flow gracefully; never loop `Unauthorized` dialogs forever.
- Admin password is `ADMIN_PASSWORD` in Vercel Environment Variables. Never hard-code or expose it. There is no default password.
- First active user can bootstrap the first admin only when the server has no active admin/moderator and the correct `ADMIN_PASSWORD` is supplied.
- Admin 2.0 uses role permissions: admin = all; moderator = dashboard/users read/reports/monitoring. Role changes are admin-only and self-demotion is blocked.
- TOTP 2FA and WebAuthn/passkeys are supported and should be encouraged for admin accounts. Passkey requires `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN`.

## Chat Security 2.0
- Plaintext chat must never be sent to or stored by the server.
- Use Web Crypto ECDH P-256 + AES-GCM.
- Each account can have multiple device keys.
- Device keys have versions and can be rotated/revoked.
- Fingerprints are shown to users; trusted fingerprints are local and key changes must be visibly warned.
- Messages use E2E v2 envelopes and per-recipient-device encrypted keys.
- Attachments are encrypted in the browser before transport; current UI limit is 2 MB.
- `content_hash` covers the E2E envelope/attachment metadata. AES-GCM provides ciphertext integrity.
- Realtime and HTTP must enforce friendship, blocks, privacy and active device-key checks.

## UI rules
- Never use browser `alert`, `confirm`, `prompt`.
- Never use native `<select>` for app controls; use the custom dropdown component.
- Confirmations/errors use the app modal system and must always be closable by button, backdrop or Escape.
- Scrollbars should visually match the app theme.
- All designs must adapt to light/dark/custom themes.
- Admin can have experimental themes without changing the main product design.

## Security QA
`npm run security:lab` runs static release checks.
`npm run test:e2e` runs UI E2E.
`npm run test:security` runs guarded active security tests only when `E2E_ALLOW_SECURITY_TESTS=1` and `E2E_TARGET_ENV=staging`.
Never point destructive/rate-limit security tests at production.

## Release reporting
Every release report must state:
1. What was changed.
2. What was verified automatically.
3. Pages/components checked.
4. What still requires real environment/manual testing.
5. DB migrations required and whether they were executed.
6. Security findings/limitations.
7. Ideas and recommended next improvements.
8. Exact version.

Do not claim production, Neon, Notion, realtime or mobile-browser behavior was tested unless it actually was.
