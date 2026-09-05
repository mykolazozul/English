-- Backward-compatible production migration for an existing English Flow v1 database.
-- Safe to run once AFTER the new schema.sql has been used on a fresh database.
-- For the project archive, schema.sql is now the canonical full schema.

-- If you already created the old v1 tables, run this migration instead of dropping data.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS login_attempts (id bigserial primary key,nick_key text not null,ip_hash text not null,success boolean not null default false,created_at timestamptz not null default now());
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS security_events (id bigserial primary key,user_id uuid references users(id) on delete set null,type text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
CREATE TABLE IF NOT EXISTS lesson_sessions (id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,mode text not null,total integer not null,started_at timestamptz not null default now(),completed_at timestamptz,perfect_bonus_awarded boolean not null default false);
CREATE TABLE IF NOT EXISTS progress_events (event_id uuid primary key,user_id uuid not null references users(id) on delete cascade,notion_id text references vocabulary(notion_id) on delete set null,mode text not null,correct boolean not null,quality smallint not null,points integer not null,created_at timestamptz not null default now());
CREATE TABLE IF NOT EXISTS admin_sessions (id uuid primary key default gen_random_uuid(),token_hash text not null unique,created_at timestamptz not null default now(),expires_at timestamptz not null,last_seen_at timestamptz not null default now());
CREATE TABLE IF NOT EXISTS admin_audit_logs (id bigserial primary key,admin_user_id uuid references users(id) on delete set null,action text not null,target_user_id uuid references users(id) on delete set null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
CREATE TABLE IF NOT EXISTS achievements (id text primary key,title text not null,description text not null,icon text not null default '🏅',rarity text not null default 'common',rule jsonb not null default '{}'::jsonb,enabled boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now());
CREATE TABLE IF NOT EXISTS user_achievements (user_id uuid not null references users(id) on delete cascade,achievement_id text not null references achievements(id) on delete cascade,earned_at timestamptz not null default now(),primary key(user_id,achievement_id));

ALTER TABLE friendships ADD COLUMN IF NOT EXISTS requested_by uuid;
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE friendships SET requested_by=user_id WHERE requested_by IS NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS lesson_id uuid;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS answer_count integer NOT NULL DEFAULT 0;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS max_answers_per_session integer NOT NULL DEFAULT 200;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS correct_count integer NOT NULL DEFAULT 0;
ALTER TABLE lesson_attempts ADD COLUMN IF NOT EXISTS event_id uuid;
ALTER TABLE lesson_attempts ADD COLUMN IF NOT EXISTS lesson_id uuid;
ALTER TABLE lesson_attempts ADD COLUMN IF NOT EXISTS quality smallint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS users_xp_idx ON users(xp DESC,updated_at ASC);
CREATE INDEX IF NOT EXISTS user_vocabulary_user_last_idx ON user_vocabulary(user_id,last_answered_at DESC);
CREATE INDEX IF NOT EXISTS lesson_attempts_user_mode_idx ON lesson_attempts(user_id,mode,created_at DESC);
CREATE INDEX IF NOT EXISTS lesson_attempts_lesson_idx ON lesson_attempts(lesson_id,notion_id);
CREATE INDEX IF NOT EXISTS messages_recipient_created_idx ON messages(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON friendships(friend_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS progress_events_user_idx ON progress_events(user_id,created_at DESC);

INSERT INTO admin_settings(key,value) VALUES
('srsVersion','2'::jsonb),('maxLessonSize','50'::jsonb),('perfectBonus','0'::jsonb)
ON CONFLICT(key) DO NOTHING;

INSERT INTO achievements(id,title,description,icon,rarity,rule,sort_order) VALUES
 ('first_steps','Перші кроки','Дай першу відповідь.','🌱','common','{"type":"attempts","value":1}',10),
 ('streak_3','Розігрів','Тримай streak 3 дні.','🔥','common','{"type":"streak","value":3}',20),
 ('streak_7','Тиждень у потоці','Тримай streak 7 днів.','🔥','rare','{"type":"streak","value":7}',30),
 ('words_20','Словниковий старт','Освой 20 слів.','📚','common','{"type":"mastery","value":20}',40),
 ('words_50','Словниковий боєць','Освой 50 слів.','📖','rare','{"type":"mastery","value":50}',50),
 ('xp_500','Перші 500','Набери 500 XP.','⚡','rare','{"type":"xp","value":500}',60),
 ('dictation','Слух і письмо','Заверши хоча б один диктант.','🎧','common','{"type":"mode","value":"dictation"}',70),
 ('match_master','Match','Успішно виконай Match.','🧩','common','{"type":"mode","value":"match"}',80),
 ('perfect_lesson','Без помилок','Заверши урок без помилки.','💎','epic','{"type":"perfect_lesson"}',85),
 ('accuracy_90','Точність','90%+ на 100 відповідях.','🎯','epic','{"type":"accuracy","value":90,"attempts":100}',90),
 ('xp_5000','Потік 5000','Набери 5000 XP.','💎','epic','{"type":"xp","value":5000}',100),
 ('streak_30','Місяць без пауз','Тримай streak 30 днів.','👑','legendary','{"type":"streak","value":30}',110)
ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,icon=excluded.icon,rarity=excluded.rarity,rule=excluded.rule,sort_order=excluded.sort_order;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_xp_nonnegative') THEN ALTER TABLE users ADD CONSTRAINT users_xp_nonnegative CHECK (xp >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_streak_nonnegative') THEN ALTER TABLE users ADD CONSTRAINT users_streak_nonnegative CHECK (streak >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_daily_goal_valid') THEN ALTER TABLE users ADD CONSTRAINT users_daily_goal_valid CHECK (daily_goal BETWEEN 1 AND 10000); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lesson_attempts_points_valid') THEN ALTER TABLE lesson_attempts ADD CONSTRAINT lesson_attempts_points_valid CHECK (points BETWEEN -100 AND 100); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_vocabulary_mastery_nonnegative') THEN ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_mastery_nonnegative CHECK (mastery >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_vocabulary_attempts_nonnegative') THEN ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_attempts_nonnegative CHECK (attempts >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_vocabulary_correct_nonnegative') THEN ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_correct_nonnegative CHECK (correct >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_vocabulary_wrong_nonnegative') THEN ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_wrong_nonnegative CHECK (wrong >= 0); END IF;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','admin','moderator'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','suspended','deleted'));
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;
ALTER TABLE friendships ADD CONSTRAINT friendships_status_check CHECK (status IN ('pending','accepted','blocked'));
ALTER TABLE progress_events DROP CONSTRAINT IF EXISTS progress_events_quality_check;
ALTER TABLE progress_events ADD CONSTRAINT progress_events_quality_check CHECK (quality BETWEEN 0 AND 5);
ALTER TABLE progress_events DROP CONSTRAINT IF EXISTS progress_events_points_check;
ALTER TABLE progress_events ADD CONSTRAINT progress_events_points_check CHECK (points BETWEEN -100 AND 100);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_attempts_event_id_uq ON lesson_attempts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS security_events_user_idx ON security_events(user_id,created_at DESC);
