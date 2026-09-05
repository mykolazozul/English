# English Flow v2.4.0 — release audit

## Implemented
- E2E chat: P-256 ECDH device keypair in IndexedDB, AES-GCM message encryption, public key only in Neon, ciphertext in messages.
- Realtime chat forwards encrypted payloads and never decrypts message text.
- HTTP chat fallback uses the same E2E payload format.
- PWA manifest + 192/512 icons + install metadata.
- Service Worker: app-shell offline fallback, runtime asset cache, stale shell recovery, versioned cache cleanup, update message.
- Existing progress queue remains server-authoritative; offline answers/progress can queue and flush on `online`.
- Challenges now surface API errors instead of silently failing.
- Roadmap/changelog updated to v2.4.0.

## Required Neon migration
Run `db/schema-v6.sql` after `schema-v5.sql`.
Without it, E2E chat device registration and encrypted message columns cannot work.

## Security model
- Plaintext chat is never sent by the new UI.
- Neon stores `ciphertext`, `iv`, crypto version and device IDs.
- Private chat key remains in IndexedDB on the device.
- P-256 public key is not secret; fingerprint can be displayed for trust-on-first-use verification.
- This protects message contents from a database/read-only server compromise. A malicious server could still replace public keys, so this is not equivalent to Signal's authenticated multi-device protocol yet.

## Offline model
Server-authoritative XP/SRS/authentication remains online-only. Offline mode provides cached UI/content and queues progress; it must not invent authoritative XP or accept server-protected lesson completion while disconnected.

## Verification
- JS syntax: server handlers + realtime + e2e crypto passed.
- Static checks: native browser dialogs absent; API gateway routes preserved; no client XP write route.
- Full Vite/Vercel production build must be run in the user's project environment because this isolated workspace has no installed npm dependencies/network package installation.
