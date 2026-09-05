# English Flow / Flov v2

A Duolingo-style English vocabulary trainer built around a Notion vocabulary source, Vercel serverless API and Neon PostgreSQL.

## Current release
**v2.5.0** — Admin 2.0 + Chat Security 2.0 + Security Lab + stability/security pass.

## Core principle
**Neon is the single source of truth for authenticated users.**

Notion = vocabulary content source.
Neon = runtime/application truth.
IndexedDB/localStorage = UI/device cache only; authenticated actions require the server.

## Stack
- React 18 + Vite
- Vercel Functions
- Neon PostgreSQL
- Notion API
- Web Crypto / server-side scrypt
- Vercel Analytics

## Major v2 changes
- Neon-backed Friends and Chat
- server-authoritative XP
- server-authoritative SRS v2
- idempotent progress events
- lesson sessions + server-verified perfect lessons
- XP anti-cheat limits
- HttpOnly `__Host-` session cookies
- admin session cookie instead of browser bearer token
- admin user management, audit log and system stats
- persistent achievements
- archived vocabulary instead of destructive Notion deletion
- online-only authenticated progress; no offline queue
- cross-device session restoration
- strict HARD mode selection
- stable question numbering

## Database
For a fresh Neon database run `db/schema.sql`.

For an existing v1 database containing real users, run `db/schema-optimized.sql` instead of dropping data.

## Environment
Copy `.env.example` and configure the variables in Vercel. Never expose database or admin secrets through `VITE_*` variables.

## Development
```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
```

## Verification
Read `AUDIT-AND-SETUP.md` for the complete deployment and verification checklist.
Read `SECURITY.md` for the security model.
Read `ARCHITECTURE.md` for the data and learning architecture.

## v2.5.0 stability rules
- `AI-CONTEXT.md` is mandatory context for future AI changes and release reports.
- Run `db/schema-v5.sql`, then `db/schema-v6.sql`, then `db/schema-v7.sql` after v4 on an existing production database.
- Admin sessions are bound to the authenticated admin/moderator account.
- Protected lessons store their exact selected vocabulary IDs and server-verify submitted answers.
- Live Notion sync never treats stale static JSON as a successful refresh.
- Home intentionally does not expose Notion sync count/timestamp; that information is admin-only.
