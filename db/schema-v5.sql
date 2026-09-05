-- English Flow v5 stability/security migration.
-- Run once AFTER schema-v4.sql. Idempotent.

-- Bind an admin session to the authenticated Neon user. Old unbound admin sessions
-- are intentionally not trusted after this migration and will require a fresh login.
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS admin_sessions_user_idx ON admin_sessions(user_id,expires_at DESC);

-- Freeze the exact vocabulary set selected for each protected lesson.
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS lesson_words jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS lesson_sessions_words_gin_idx ON lesson_sessions USING gin (lesson_words);

-- Fast operational queries.
CREATE INDEX IF NOT EXISTS sessions_last_seen_idx ON sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS security_events_type_created_idx ON security_events(type,created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_created_idx ON reports(target_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS social_mutes_target_idx ON social_mutes(target_user_id,muted_until);

-- Keep old, expired admin sessions from accumulating.
DELETE FROM admin_sessions WHERE expires_at < now();
