# Release Audit — v2.5.0

## Scope
Security & QA release. PWA/offline was intentionally removed.

## Implemented
- Lesson timeout + empty-state handling.
- Auth-expiry event and recovery flow.
- Admin 2.0 bootstrap, permission boundaries, TOTP 2FA and session metadata.
- Chat Security 2.0: multi-device, rotation, revoke, fingerprints, key-change warning, E2E v2, encrypted attachments and integrity hash.
- Playwright E2E + guarded Security Lab.
- Custom themed scrollbars.
- Changelog/AI context/roadmap updates.

## DB migration
Run `db/schema-v7.sql` and then `db/schema-v8.sql` after schema-v6 on an existing database. v8 is required for passkey features; v7 is required for Chat Security 2.0.

## Automated checks
- JS/MJS server syntax checks: required for all modified server files.
- Static Security Lab: `npm run security:lab`.
- Playwright UI/security tests: available after `npm install` and browser installation.
- Full Vite build must be run in the project environment before production.

## Manual acceptance
- Two real accounts for E2E chat.
- Two browsers/devices for multi-device chat.
- TOTP setup/login.
- Admin bootstrap.
- Neon v7 execution.
- Notion sync.
- Realtime server.
- Mobile responsive UI.
- Production deployment.
