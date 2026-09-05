-- English Flow v3 production migration. Run once on the existing Neon production DB.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_profile boolean NOT NULL DEFAULT true,
  show_leaderboard boolean NOT NULL DEFAULT true,
  allow_friend_requests boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  show_online boolean NOT NULL DEFAULT true,
  analytics_consent boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_blocks (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,target_user_id), CHECK(user_id<>target_user_id)
);
CREATE INDEX IF NOT EXISTS social_blocks_target_idx ON social_blocks(target_user_id);

CREATE TABLE IF NOT EXISTS social_mutes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,target_user_id), CHECK(user_id<>target_user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id bigserial PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK(type IN ('user','message','challenge','other')),
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status,created_at DESC);

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK(kind IN ('daily','public','friend','private')),
  metric text NOT NULL CHECK(metric IN ('xp','accuracy','answers','mastery')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal integer NOT NULL CHECK(goal>0),
  visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','friends','private')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','finished','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS challenges_active_idx ON challenges(status,ends_at);
CREATE INDEX IF NOT EXISTS challenges_creator_idx ON challenges(creator_id,created_at DESC);

CREATE TABLE IF NOT EXISTS challenge_participants (
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  answers integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY(challenge_id,user_id)
);
CREATE INDEX IF NOT EXISTS challenge_participants_user_idx ON challenge_participants(user_id,joined_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_key text NOT NULL,
  event_name text NOT NULL CHECK(length(event_name) BETWEEN 1 AND 80),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(event_name,created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS realtime_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online' CHECK(status IN ('online','away','offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_pair_time_idx ON messages(sender_id,recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_deleted_idx ON messages(deleted_at,created_at DESC);
CREATE INDEX IF NOT EXISTS lesson_sessions_active_idx ON lesson_sessions(user_id,completed_at,started_at DESC);
CREATE INDEX IF NOT EXISTS progress_events_lesson_idx ON progress_events(lesson_id,created_at);

INSERT INTO privacy_settings(user_id) SELECT id FROM users ON CONFLICT DO NOTHING;

INSERT INTO achievements(id,title,description,icon,rarity,rule,sort_order) VALUES
('answers_100','Сто відповідей','Дай 100 відповідей.','🧠','rare','{"type":"attempts","value":100}',120),
('accuracy_95','Снайпер','Досягни 95% точності на 200 відповідях.','🎯','legendary','{"type":"accuracy","value":95,"attempts":200}',130),
('srs_50','Машина повторень','Успішно повтори 50 карток через SRS.','🔁','rare','{"type":"srs_correct","value":50}',140),
('challenge_win','Чемпіон','Виграй перший challenge.','🏆','epic','{"type":"challenge_win","value":1}',150),
('social','Командний гравець','Додай першого друга.','🤝','common','{"type":"friends","value":1}',160)
ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,icon=excluded.icon,rarity=excluded.rarity,rule=excluded.rule,sort_order=excluded.sort_order;

INSERT INTO admin_settings(key,value) VALUES
('dailyXpCap','2000'::jsonb),('analyticsRetentionDays','180'::jsonb),('realtimeEnabled','true'::jsonb),('challengeEnabled','true'::jsonb),('srsAlgorithm','fsrs-lite'::jsonb)
ON CONFLICT(key) DO NOTHING;
