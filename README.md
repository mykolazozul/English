# English Flow v0.7-beta

Платформа вивчення англійської (React + Vite).

## Що є зараз
- Vocabulary Sprint (стабільні питання, зелені/червоні кнопки)
- Режими EN→UA і UA→EN
- Диктант (ввід з клавіатури)
- Match-гра
- SRS (1→3→7→14→30→60 днів)
- Категорії, статистика з графіком, бейджі
- Нік-профіль + локальні профілі; опційна хмара Supabase для крос-девайс
- Адмінка з паролем (за замовчуванням `2468`)
- 3 дизайни UI: Classic Green / Neon Cyber / Paper Academic
- Теми: світла / темна / custom
- Vercel Analytics, `base: /`

## Відкладено (нагадати)
- Повна синхронізація слів з Notion (скрипт уже є)
- Аудіо від носіїв
- Push/email нагадування
- PWA
- Міні-діалоги
- Інші мови

## Supabase (крос-девайс нік)
1. Створи проєкт Supabase
2. Таблиця SQL:
```sql
create table players (
  nick text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);
-- увімкни upsert по nick
```
3. У Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. RLS: дозволь anon read/write по політиці (або тільки insert/update для свого nick)

Без Supabase все працює локально; той самий нік на іншому браузері без хмари не підтягнеться.

## Notion слова
Поки `notionWords = []` — використовуються 50 локальних слів.
Після `NOTION_TOKEN` + `npm run sync:notion` підтягнуться всі слова з Notion.

## Деплой
Vercel ← GitHub, Framework Vite. Після push — 1–3 хв.


## Admin server password
Set `ADMIN_PASSWORD` in Vercel env. API: `POST /api/admin-auth` with `{ "password": "..." }`.
Without API (local), falls back to client check.

## Analytics
Uses `@vercel/analytics/react` (Vite SPA). Enable Web Analytics in Vercel dashboard.
