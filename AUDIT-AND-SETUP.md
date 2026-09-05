# English Flow v2 — Audit, setup and verification

## What was fixed

### Critical / security
- Client can no longer set authoritative XP/streak/today XP through profile sync.
- XP is calculated server-side from admin settings.
- SRS is calculated server-side.
- Duplicate answer submissions are blocked by idempotent `event_id`.
- Progress requires a server-created lesson session.
- Positive XP has a daily safety cap.
- Login attempts are rate-limited per nickname.
- Password storage uses salted scrypt v2.
- Legacy password hashes are upgraded after successful login.
- Session tokens are stored only as SHA-256 hashes in Neon.
- Admin authentication moved from sessionStorage bearer tokens to HttpOnly `__Host-ef_admin` cookies.
- Admin actions are audited.

### Data architecture
- Friends moved to Neon.
- Chat moved to Neon.
- Achievements moved to Neon.
- SRS/mastery/history are Neon-backed.
- Notion vocabulary is archived rather than destructively deleted.
- local storage is treated as cache/offline queue, not the authority.

### Learning logic
- SRS due cards no longer fall back to the whole dictionary.
- HARD mode contains only genuinely problematic words.
- HARD mode no longer silently loads random/new words.
- LONG mode no longer falls back to all words.
- Question numbering uses the frozen lesson index: `1/N`, `2/N`, etc.
- Progress percentage starts at the first question rather than 0%.
- Duplicate multiple-choice distractors are avoided by the source selection logic.
- Perfect lesson bonus is verified server-side instead of being a client-only XP write.

## Database setup

### Fresh Neon database
Run **`db/schema.sql` once** in the normal SQL editor.

### Existing v1 database
If the old 9-table schema is already in Neon and contains real user data, do **not** drop it. Run **`db/schema-optimized.sql`** first, then deploy the application.

The full `db/schema.sql` is the canonical schema for new environments.

## Vercel environment variables
Set these as server-side environment variables:

- `DATABASE_URL`
- `NOTION_TOKEN`
- `NOTION_DATA_SOURCE_ID`
- `NOTION_VERSION`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET`
- `SYNC_SECRET`

Never use `VITE_` prefixes for secrets.

Generate secrets locally, for example:

```bash
openssl rand -base64 48
```

Use different values for all three admin/sync secrets.

## First verification

1. Deploy.
2. Open `/api/health` — database should be `true`.
3. Register a test account.
4. Refresh — account remains logged in.
5. Start a lesson.
6. Answer one question.
7. Check Neon:
   - `progress_events` has one event.
   - `lesson_attempts` has one row.
   - `user_vocabulary` has one card.
   - `users.xp` changed by the server-defined amount.
8. Submit the same event twice — XP must change only once.
9. Finish a lesson — perfect bonus can only be awarded by `/api/lessons`.
10. Add another user as a friend.
11. Accept the friend request.
12. Send a chat message.
13. Log in from a second device/browser — the same Neon progress should appear.
14. Open admin — the admin cookie should be HttpOnly and no admin token should exist in sessionStorage.
15. Run a Notion sync — removed Notion words should become archived, not delete historical progress.

## Verification limitations of this build session
All server-side JavaScript files were syntax-checked successfully.
The frontend Vite build was not executed because dependencies could not be installed in the isolated build environment before timeout. Therefore this is a static audit plus server syntax verification, not a claim of completed browser E2E testing.

## Remaining production work
- add a formal E2E suite (Playwright)
- add error monitoring (Sentry or equivalent)
- scheduled session cleanup
- automated Neon backups/restore drill
- dependency lockfile and Dependabot/Renovate
- stronger server-generated lesson item selection
- FSRS/validated spaced repetition if research testing supports it
- push notifications / reminders
- moderation tooling for chat
- privacy settings for leaderboard/profile
- account deletion/export flow
