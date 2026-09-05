# Neon setup — English Flow v2

## If Neon is empty
1. Open the Neon SQL Editor.
2. Make sure the editor is in normal SQL mode, not Explain/EXPLAIN ANALYZE.
3. Paste all of `db/schema.sql`.
4. Run it once.
5. The result should contain the core application tables plus security/admin tables.

## If you already ran the old v1 schema
Do **not** drop your database.

Run `db/schema-optimized.sql` once. It adds the v2 tables/columns/indexes and keeps existing users and progress.

## Quick checks
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;

SELECT count(*) AS users FROM users;
SELECT count(*) AS words FROM vocabulary WHERE archived=false;
SELECT count(*) AS attempts FROM lesson_attempts;
SELECT count(*) AS friends FROM friendships;
SELECT count(*) AS messages FROM messages;
SELECT count(*) AS achievements FROM achievements;
```

## Important
Never paste `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `SYNC_SECRET` or `NOTION_TOKEN` into frontend code, GitHub issues, screenshots or public repositories.

## Existing production database already on v2/v3/v4
Run migrations in order only once:
- `db/schema-v3.sql`
- `db/schema-v4.sql`
- `db/schema-v5.sql`

For the current v2.5.0 code, run **v5, then v6, then v7, then v8**.

## v2.5.0 migration
- `db/schema-v5.sql` — bound admin sessions + protected lesson word sets.
- `db/schema-v6.sql` — E2E device/message foundation.
- `db/schema-v7.sql` — multi-device E2E, encrypted attachments, key rotation/revocation fields and Admin 2.0 TOTP storage.
- `db/schema-v8.sql` — Admin WebAuthn/passkey credentials and short-lived challenges.

Run each once in order on the existing production database. They are designed to be idempotent where possible.
