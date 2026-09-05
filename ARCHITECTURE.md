# English Flow / Flov — Production Architecture v2

```text
Notion
  │ vocabulary content
  ▼
GitHub Action / manual sync
  │
  ▼
Vercel API ───────────────► Neon PostgreSQL
  │                              │
  │                              ├─ users
  │                              ├─ vocabulary
  │                              ├─ user_vocabulary (SRS)
  │                              ├─ progress_events
  │                              ├─ lesson_attempts
  │                              ├─ lesson_sessions
  │                              ├─ friendships
  │                              ├─ messages
  │                              ├─ achievements
  │                              └─ admin/audit/security data
  ▼
React client
  │
  ├─ IndexedDB/localStorage = cache + offline queue only
  └─ Neon = authoritative state
```

## Learning loop
1. Client asks the server to create a lesson session.
2. Client displays a frozen question list.
3. Every answer receives a unique event ID.
4. Server validates the lesson session and computes points/SRS.
5. Server stores the event exactly once.
6. Client reconciles optimistic state with server state.
7. Completing a perfect lesson is verified server-side.

## SRS v2
Each card contains:
- `stage`
- `ease`
- `interval`
- `dueAt`
- `repetitions`
- `lapses`

Quality 0–2 = failure/reset.
Quality 3–5 = successful review with increasing interval and adaptive ease.

Initial intervals are 1 → 3 → adaptive growth, with a maximum stage of 8. The algorithm is deliberately simple enough to audit and can later be replaced by a tested FSRS implementation without changing the rest of the architecture.

## Question selection
- SRS: only due learned cards.
- HARD: only cards with at least 2 mistakes and more mistakes than correct answers.
- LONG: only words longer than 6 letters.
- Category filter is applied after mode selection.
- Question order is shuffled by the server-configured setting.
- The displayed number is always `currentIndex + 1` and therefore cannot jump backwards.

The HARD mode never falls back to the whole dictionary.
