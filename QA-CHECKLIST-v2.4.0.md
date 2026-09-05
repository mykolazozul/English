# English Flow v2.4.0 — QA checklist

## Pages / UI surfaces reviewed in source
- Onboarding / auth: registration, login, guest mode, validation, server session flow.
- Home/Dashboard: XP, streak, goal, emoji feedback, no Notion sync metadata.
- Learn: lesson selection, category/direction/mode controls, protected lesson start.
- Lesson: server-created session, frozen word set, answer submission, XP/SRS update, completion.
- Vocabulary: catalog, search/filter and cached vocabulary.
- SRS Review: due-card selection and review start.
- Statistics: accuracy, XP, modes, animated emoji feedback.
- Badges: earned/locked states and custom feedback.
- Problem Words: only cards with actual errors; no zero-error cards.
- Leaderboard: server-backed ranking and privacy handling.
- Challenges: create, join, score, visibility, error surfaces.
- Friends: friend requests, accepted friends, E2E chat, realtime state, HTTP fallback, block/mute/report.
- Settings: theme/skin, sound, keyboard hints, comparison and privacy.
- Profile: RPG profile and progression display.
- About: version, changelog, PWA status/install/update, realtime status/ping.
- Admin: custom UI, three design lab themes, Notion sync, stats, analytics, audit, reports, monitoring, lesson settings, badges, user management.
- Admin expiry/re-entry: fail-closed gate rather than blank screen.
- Offline state/banner: cached shell/content and queued progress model.

## API families reviewed
- auth, profile, progress, lessons, vocabulary, config
- friends, friend-leaderboard, social, privacy, chat, challenges, reports
- analytics
- admin-auth, admin-users, admin-settings, admin-stats, admin-analytics, admin-audit, admin-monitoring
- notion-sync, cron-analytics-cleanup, health

## Security checks
- No browser alert/confirm/prompt in application UI.
- No native select introduced; custom UiSelect remains the control path.
- Client XP/mastery/SRS are not accepted as authoritative profile writes.
- Admin auth uses HttpOnly `__Host-ef_admin` cookie and Neon session binding.
- New chat sends require E2E ciphertext; plaintext POST chat is rejected.
- Realtime chat requires authenticated session + friendship + block/privacy checks.
- Realtime validates E2E device registration and payload limits.
- WebSocket server has max payload and message-rate limits.
- PWA never caches API/auth responses.

## Known external/manual checks
These require the deployed environment and/or real accounts and cannot be truthfully marked as locally browser-tested here:
- Vite production build and Vercel deployment.
- Neon v6 migration execution.
- Two-account E2E chat interoperability across separate browsers/devices.
- Realtime WebSocket connectivity from the deployed realtime host.
- Notion live sync using configured Notion credentials.
- Admin login with the production secret and expiry/re-entry.
- iOS/Android install prompt and standalone launch.
- Offline airplane-mode browser test and queued progress replay.
- Mobile/tablet visual QA across Safari/Chrome.
