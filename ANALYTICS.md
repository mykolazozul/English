# Product analytics

The app collects first-party product events only when analytics consent is enabled.

Tracked events include app open, page view, lesson start/answer/complete, SRS review, challenge join/complete, friend request/accept, chat send/read, feature use and client errors.

The server stores an HMAC-SHA256 IP hash, not the raw IP. Event data is allow-listed and excludes passwords, tokens, cookies, raw IPs and message contents.

Admin analytics exposes aggregates: unique users, event volume, lessons, answers, completion, daily activity, modes, retention snapshot and error counts.

Raw analytics events should be retained for a limited period. Use the `analyticsRetentionDays` admin setting and scheduled cleanup when the product is live.
