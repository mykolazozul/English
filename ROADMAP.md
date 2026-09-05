# English Flow / Flov — Product roadmap

## Phase 0 — foundation (now)
- Neon single source of truth
- server XP / SRS / achievements
- Neon friends/chat
- secure sessions
- admin panel + audit
- Notion → Neon content pipeline
- offline queue

## Phase 1 — learning quality
1. **Daily Challenge** — one focused lesson every day.
2. **Adaptive difficulty** — choose the next card from SRS + recent error rate + confidence.
3. **Weak Words** — separate mistakes from merely new words.
4. **Review Mistakes** — exact questions previously missed.
5. **CEFR progression** — A1 → A2 → B1 → B2 → C1 with gated content.
6. **Grammar path** — grammar topics linked to vocabulary.
7. **Listening** — audio-first questions.
8. **Speaking** — speech recognition + pronunciation scoring.
9. **Writing** — short free-response tasks.
10. **Translation directions** — EN→UA, UA→EN, contextual translation.

## Phase 2 — game loop
- XP multipliers for consistent accuracy
- combo/streak during a lesson
- hearts/lives used carefully, never blocking serious study
- levels and ranks
- achievements with rarity
- leagues
- seasons
- weekly missions
- profile cosmetics
- rewards for recovery after a missed streak

## Phase 3 — social
- friend requests
- friend leaderboard
- direct chat moderation
- unread counters
- report/block/mute
- weekly friend challenges
- private/public profile settings

## Phase 4 — admin / operations
- user search/filter/sort
- suspend/restore/ban
- progress reset tools
- audit history
- vocabulary health dashboard
- Notion sync diff viewer
- duplicate-word detector
- broken-example detector
- difficulty analytics
- retention analytics
- lesson completion funnel
- suspicious XP detector
- feature flags

## Phase 5 — AI tutor
- explain a word at the learner's level
- generate additional examples
- create personalized mini-lessons
- conversation practice
- grammar correction
- explain mistakes instead of only saying wrong/right
- adaptive revision plans

## Phase 6 — serious platform engineering
- Playwright E2E suite
- automated API tests
- rate limiting at the edge
- monitoring/error tracking
- backups and restore drills
- dependency lockfile
- dependency scanning
- secret rotation
- data export/deletion
- privacy controls
- localization
- accessibility audit

## Learning philosophy
The product should not optimize for "number of clicks". It should optimize for durable recall.

The core loop should become:

**learn → retrieve → make mistakes → receive explanation → repeat at the right interval → use in context → verify long-term retention**.

SRS should decide *when* to review; difficulty should decide *what* to review; the learner's history should decide *how* to teach it.
