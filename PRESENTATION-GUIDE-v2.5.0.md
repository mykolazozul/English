# English Flow v2.5.0 — presentation guide

## 7-minute demo

### 1. Opening — 30 sec
Say: "English Flow is a Duolingo-style English trainer where Notion supplies vocabulary, Neon is the source of truth, Vercel serves the app/API, and realtime is a separate service."

### 2. Home — 45 sec
Show:
- XP
- streak
- daily goal
- animated learning feedback
- learned/due counts
- no raw Notion sync metadata

### 3. Lesson — 90 sec
Start Sprint. Demonstrate:
- server-created protected lesson
- question numbering
- correct answer → XP
- wrong answer → error/SRS change
- finish screen
Then open Problem Words and explain that a clean word does not appear there.

### 4. Vocabulary + SRS — 45 sec
Show search/filter, then SRS due cards. Explain that Neon owns the authoritative progress.

### 5. Social + E2E Chat — 90 sec
Use two test accounts. Become friends, open chat, show:
- E2E v2 indicator
- fingerprint
- verify fingerprint
- send text
- send a small encrypted attachment
- open device management
- rotate a key
- show the key-change warning on the other account
- optionally revoke a second device

### 6. Admin 2.0 — 90 sec
Show:
- admin login
- role/permissions
- TOTP 2FA
- passkey registration/login
- Notion sync
- analytics
- monitoring
- audit log
- three admin visual designs

### 7. Security story — 45 sec
Explain:
- HttpOnly host-only cookies
- server-authoritative XP/SRS
- protected lesson sessions
- rate limits
- E2E chat ciphertext
- no plaintext chat storage
- Security Lab / Playwright regression tests

## Demo rules
- Use staging/test accounts, never real user data.
- Do not show passwords, secrets, DATABASE_URL, tokens or Notion tokens.
- Do not run destructive Security Lab tests against production.
- Keep a backup test account so admin/security tests cannot lock the only account.
