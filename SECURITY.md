# English Flow — Security model

## Passwords
Passwords are **not encrypted** and never should be. They are stored as salted, memory-hard scrypt hashes (`s2$salt$hash`). The server also upgrades legacy v1 `salt:hash` records to scrypt v2 after a successful login.

Recommended password policy for production:
- 12+ characters minimum in the UI; the API currently requires 10+.
- upper + lower case + number
- unique password
- never reuse the admin password

## Nicknames
Nicknames are public identifiers, not passwords. The database enforces case-insensitive uniqueness with an index on `lower(nick)`. Do not treat a nickname as a secret.

## Sessions
User sessions are random 256-bit tokens. Only a SHA-256 digest is stored in Neon. The browser receives an HttpOnly, Secure, SameSite=Strict `__Host-ef_session` cookie.

Admin sessions use a separate random token and the same cookie hardening (`__Host-ef_admin`). The admin token is never stored in localStorage/sessionStorage.

## XP / anti-cheat
The browser never gets authority to choose XP. `/api/progress`:
- derives points from server-side admin settings
- derives SRS state on the server
- uses a UUID idempotency key (`event_id`)
- requires a server-created lesson session
- limits answers per lesson
- limits lesson creation frequency
- caps positive daily XP at 2000
- records progress events and lesson attempts

The browser may optimistically display progress for responsiveness, but Neon is authoritative.

## Single source of truth
Neon is authoritative for:
- users / XP / streak
- vocabulary
- SRS / mastery
- lesson history
- achievements
- friends
- chat
- admin settings

localStorage / IndexedDB are caches only. Authenticated progress is submitted online to Neon; there is no offline progress queue.

Notion is the source of vocabulary content. Neon is the source used by the application at runtime.

## Database safety
- foreign keys with cascading user deletion where appropriate
- checks for XP, streak, attempts, mastery, points and message length
- archived vocabulary instead of destructive deletion during Notion sync
- admin audit log
- expired session cleanup can be scheduled

## What cannot be promised
No web application can honestly be called impossible to hack. This design removes the major client-side trust problems, but production still needs monitoring, dependency updates, backups, secret rotation, and periodic security testing.

## v2.3.0 hardening
- Admin authentication requires an already authenticated `admin`/`moderator` Neon account plus the server-side admin password.
- Admin session records are bound to `admin_sessions.user_id`; unbound legacy sessions are no longer accepted.
- Protected lesson sessions store `lesson_words`, and `/api/progress` rejects a word that was not selected for that session.
- `/api/progress` derives correctness from the authoritative Neon vocabulary and submitted answer; client-supplied `correct` is not trusted.
- Realtime chat applies the same friendship, block and recipient message-privacy checks as HTTP chat.
- Realtime payloads are size/rate limited and expose a ping/pong health check.
