-- English Flow v4 analytics/performance migration.
-- Run once AFTER schema-v3.sql. Idempotent.

CREATE INDEX IF NOT EXISTS progress_events_created_idx ON progress_events(created_at DESC);
CREATE INDEX IF NOT EXISTS progress_events_mode_created_idx ON progress_events(mode,created_at DESC);
CREATE INDEX IF NOT EXISTS lesson_sessions_mode_started_idx ON lesson_sessions(mode,started_at DESC);
CREATE INDEX IF NOT EXISTS users_created_idx ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_user_created_idx ON analytics_events(event_name,user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_score_idx ON challenge_participants(challenge_id,score DESC);
