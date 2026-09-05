# English Flow production plan

Neon is the system of record. Notion is the vocabulary authoring source. Vercel is the HTTP/API frontend layer. The WebSocket service is a separate long-lived Node service and writes/reads chat through Neon. Browser storage is cache/offline only.

## Security boundary
Browser → API → Neon. Never Browser → Neon.

## Learning boundary
UI → Learning Engine/API → server-authoritative progress → Neon.

## Social boundary
Friends, blocks, mutes, reports, challenges and chat are server data.

## Analytics boundary
Consent → first-party event → HMAC IP hash → aggregate admin dashboard. Do not store raw IP, passwords, tokens, cookies or message contents.
