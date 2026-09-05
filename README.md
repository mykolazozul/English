# English Flow / Flov v2

A Duolingo-style English vocabulary trainer built around a Notion vocabulary source, Vercel serverless API and Neon PostgreSQL.

## Core principle
**Neon is the single source of truth for authenticated users.**

Notion = vocabulary content source.
Neon = runtime/application truth.
IndexedDB/localStorage = cache and offline queue only.

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
- offline progress queue
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
