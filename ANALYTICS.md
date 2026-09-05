# English Flow Analytics

## Single source of truth
Admin analytics is server-side and reads authoritative Neon data. Browser `localStorage` / IndexedDB snapshots are not used for admin product metrics. Notion remains the content source; Neon is the application source of truth.

## Product
- active users for the selected period
- new users: today / 7d / 30d / selected period
- lessons started/completed and completion rate
- answers, accuracy, XP earned and average XP per active user
- daily activity timeline
- lesson funnel: app opens → lessons → answers → completed
- mode performance: starts, completion, accuracy, average lesson time

## Learning Engine
- new/studied/mastered cards
- words reviewed
- due SRS cards
- SRS review count and SRS accuracy
- average attempts and mastery
- CEFR vocabulary distribution
- most difficult/problem words with error rate
- most reviewed words
- high-accuracy/easy words
- never-shown vocabulary

## Users / Social
- active/suspended/deleted users
- new users today/7d/30d
- friendships and pending requests
- messages
- challenges created/joined/completed
- cohort D1/D7/D30 retention

## Security
- security events
- failed logins
- open reports
- report volume
- top recorded client errors

## System / Realtime
- DB latency
- active sessions
- answers/hour
- API errors/hour
- realtime online presence
- realtime open/reconnect/error events

## Privacy
Raw IP is never stored by analytics; only an HMAC-SHA256 hash is stored for abuse/aggregation use. Event payloads are allow-listed and exclude passwords, tokens, cookies, raw IPs, emails, and message contents. The old local 1–17 privacy snapshot has been removed from Admin.

## Retention
A daily Vercel cron calls `/api/cron-analytics-cleanup` and removes raw analytics events older than the `analyticsRetentionDays` admin setting (bounded to 30–3650 days). Set `CRON_SECRET` in Vercel. Vercel cron requests use that secret as the bearer authorization for the cleanup endpoint.

## Performance
`db/schema-v4.sql` adds indexes for the analytics/progress/lesson queries used by the Admin dashboard. Run it once after v3 on the production Neon database.
