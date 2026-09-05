-- English Flow / Flov — production Neon schema v2
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nick text not null unique,
  name text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user','admin','moderator')),
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 1 check (streak >= 0),
  daily_goal integer not null default 50 check (daily_goal between 1 and 10000),
  today_xp integer not null default 0 check (today_xp between -1000000 and 1000000),
  today date not null default current_date,
  avatar text not null default '🇺🇸',
  theme text not null default 'system',
  skin text not null default 'classic',
  settings jsonb not null default '{}'::jsonb,
  profile_data jsonb not null default '{}'::jsonb,
  last_login_at timestamptz,
  banned_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_nick_lower_idx on users (lower(nick));
create index if not exists users_xp_idx on users (xp desc, updated_at asc);
create index if not exists users_status_idx on users(status, updated_at desc);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);
create index if not exists sessions_expiry_idx on sessions(expires_at);

create table if not exists login_attempts (
  id bigserial primary key,
  nick_key text not null,
  ip_hash text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_key_idx on login_attempts(nick_key, created_at desc);
create index if not exists login_attempts_ip_idx on login_attempts(ip_hash, created_at desc);

create table if not exists vocabulary (
  notion_id text primary key,
  word text not null,
  translation text not null default '—',
  pronunciation text not null default '',
  category text not null default 'Other',
  level text not null default '',
  explanation text not null default '',
  example text not null default '',
  notion_url text not null default '',
  added date,
  updated_at timestamptz not null default now(),
  archived boolean not null default false
);
create index if not exists vocabulary_word_idx on vocabulary(lower(word));
create index if not exists vocabulary_category_idx on vocabulary(category);
create index if not exists vocabulary_level_idx on vocabulary(level);

create table if not exists user_vocabulary (
  user_id uuid not null references users(id) on delete cascade,
  notion_id text not null references vocabulary(notion_id) on delete cascade,
  mastery integer not null default 0 check (mastery >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  correct integer not null default 0 check (correct >= 0),
  wrong integer not null default 0 check (wrong >= 0),
  srs jsonb not null default '{"version":2,"stage":0,"ease":2.5,"interval":0,"dueAt":null,"repetitions":0,"lapses":0}'::jsonb,
  last_answered_at timestamptz,
  primary key(user_id, notion_id)
);
create index if not exists user_vocabulary_user_last_idx on user_vocabulary(user_id,last_answered_at desc);
create index if not exists user_vocabulary_due_idx on user_vocabulary(user_id,(srs->>'dueAt'));
create index if not exists user_vocabulary_mastery_idx on user_vocabulary(user_id,mastery desc);

create table if not exists security_events (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_user_idx on security_events(user_id,created_at desc);

create table if not exists lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mode text not null,
  total integer not null check(total between 1 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  perfect_bonus_awarded boolean not null default false,
  max_answers_per_session integer not null default 200,
  answer_count integer not null default 0,
  correct_count integer not null default 0
);
create index if not exists lesson_sessions_user_idx on lesson_sessions(user_id,started_at desc);

create table if not exists progress_events (
  event_id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  notion_id text references vocabulary(notion_id) on delete set null,
  lesson_id uuid references lesson_sessions(id) on delete set null,
  mode text not null default 'sprint' check (length(mode) between 1 and 40),
  correct boolean not null,
  quality smallint not null check (quality between 0 and 5),
  points integer not null check (points between -100 and 100),
  created_at timestamptz not null default now()
);
create index if not exists progress_events_user_idx on progress_events(user_id,created_at desc);
create index if not exists progress_events_word_idx on progress_events(user_id,notion_id,created_at desc);

create table if not exists lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid unique references progress_events(event_id) on delete set null,
  lesson_id uuid references lesson_sessions(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  notion_id text references vocabulary(notion_id) on delete set null,
  mode text not null default 'sprint',
  correct boolean not null,
  points integer not null default 0 check (points between -100 and 100),
  quality smallint not null default 0 check (quality between 0 and 5),
  created_at timestamptz not null default now()
);
create index if not exists lesson_attempts_user_idx on lesson_attempts(user_id,created_at desc);
create index if not exists lesson_attempts_user_mode_idx on lesson_attempts(user_id,mode,created_at desc);

create table if not exists friendships (
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  requested_by uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,friend_id),
  check(user_id <> friend_id)
);
create index if not exists friendships_friend_idx on friendships(friend_id,status,created_at desc);
create index if not exists friendships_user_idx on friendships(user_id,status,created_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz,
  check(sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on messages(sender_id,recipient_id,created_at desc);
create index if not exists messages_recipient_created_idx on messages(recipient_id,created_at desc);

create table if not exists achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏅',
  rarity text not null default 'common' check(rarity in ('common','rare','epic','legendary')),
  rule jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists user_achievements (
  user_id uuid not null references users(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id,achievement_id)
);
create index if not exists user_achievements_user_idx on user_achievements(user_id,earned_at desc);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index if not exists admin_sessions_expiry_idx on admin_sessions(expires_at);

create table if not exists admin_audit_logs (
  id bigserial primary key,
  admin_user_id uuid references users(id) on delete set null,
  action text not null,
  target_user_id uuid references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on admin_audit_logs(created_at desc);

create table if not exists sync_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into admin_settings(key,value) values
 ('lessonSize','10'::jsonb),('correctPoints','4'::jsonb),('wrongPoints','-2'::jsonb),('masteryThreshold','8'::jsonb),
 ('shuffleQuestions','true'::jsonb),('shuffleAnswers','true'::jsonb),('showPronunciation','true'::jsonb),('maintenanceMode','false'::jsonb),
 ('maxLessonSize','50'::jsonb),('srsVersion','2'::jsonb),('perfectBonus','0'::jsonb)
on conflict(key) do nothing;

insert into achievements(id,title,description,icon,rarity,rule,sort_order) values
 ('first_steps','Перші кроки','Дай першу відповідь.','🌱','common','{"type":"attempts","value":1}',10),
 ('streak_3','Розігрів','Тримай streak 3 дні.','🔥','common','{"type":"streak","value":3}',20),
 ('streak_7','Тиждень у потоці','Тримай streak 7 днів.','🔥','rare','{"type":"streak","value":7}',30),
 ('words_20','Словниковий старт','Освой 20 слів.','📚','common','{"type":"mastery","value":20}',40),
 ('words_50','Словниковий боєць','Освой 50 слів.','📖','rare','{"type":"mastery","value":50}',50),
 ('xp_500','Перші 500','Набери 500 XP.','⚡','rare','{"type":"xp","value":500}',60),
 ('dictation','Слух і письмо','Заверши хоча б один диктант.','🎧','common','{"type":"mode","value":"dictation"}',70),
 ('match_master','Match','Успішно виконай Match.','🧩','common','{"type":"mode","value":"match"}',80),
 ('perfect_lesson','Без помилок','Заверши урок без помилки.','💎','epic','{"type":"perfect_lesson"}',85),
 ('accuracy_90','Точність','Досягни 90% точності на 100 відповідях.','🎯','epic','{"type":"accuracy","value":90,"attempts":100}',90),
 ('xp_5000','Потік 5000','Набери 5000 XP.','💎','epic','{"type":"xp","value":5000}',100),
 ('streak_30','Місяць без пауз','Тримай streak 30 днів.','👑','legendary','{"type":"streak","value":30}',110)
on conflict(id) do update set title=excluded.title,description=excluded.description,icon=excluded.icon,rarity=excluded.rarity,rule=excluded.rule,sort_order=excluded.sort_order;

-- Maintenance: DELETE FROM sessions WHERE expires_at < now(); DELETE FROM admin_sessions WHERE expires_at < now();
