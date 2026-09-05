# Neon — що робити зараз

Твоя production база вже містить v1→v2 migration. Наступний крок — **тільки v3 migration**.

## 1. Відкрий production branch
Neon → project `square-math-87619136` → Branch `production` → database `neondb` → SQL Editor.

## 2. Переконайся, що режим звичайного SQL
Не `EXPLAIN` / `ExplainAnalyze`.

## 3. Скопіюй весь файл
`db/schema-v3.sql`

## 4. Натисни Run один раз
Це додає social/privacy/challenges/analytics/realtime таблиці, індекси та нові achievements.

## 5. Перевір таблиці
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;
```

Мають бути щонайменше:
- analytics_events
- challenges
- challenge_participants
- privacy_settings
- reports
- social_blocks
- social_mutes
- realtime_presence
- усі старі users/sessions/vocabulary/user_vocabulary/lesson_* таблиці

## 6. Перевір дані
```sql
SELECT count(*) AS users FROM users;
SELECT count(*) AS words FROM vocabulary WHERE archived=false;
SELECT count(*) AS achievements FROM achievements;
SELECT count(*) AS privacy_rows FROM privacy_settings;
```

## 7. Більше SQL зараз не запускай
Після цього дай deployment API зробити smoke-test. Якщо якийсь SQL запит поверне помилку — **не запускай навмання повторно**; надішли мені текст помилки.

## Важливо
`DATABASE_URL` з Vercel не копіюй у код і не став як `VITE_DATABASE_URL`. Browser ніколи не повинен отримати доступ до Neon напряму.
