-- English Flow v2.5.0 migration. Run AFTER schema-v6.sql.
-- Idempotent. This migration removes PWA/offline storage requirements and upgrades Admin + E2E Chat.

-- Chat: one account may have multiple active devices.
ALTER TABLE chat_devices DROP CONSTRAINT IF EXISTS chat_devices_pkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chat_devices_pkey') THEN
    ALTER TABLE chat_devices ADD CONSTRAINT chat_devices_pkey PRIMARY KEY (device_id);
  END IF;
END $$;
ALTER TABLE chat_devices ADD COLUMN IF NOT EXISTS key_version integer NOT NULL DEFAULT 1;
ALTER TABLE chat_devices ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE chat_devices ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE INDEX IF NOT EXISTS chat_devices_user_active_idx ON chat_devices(user_id,revoked_at,updated_at DESC);

-- E2E messages must never require plaintext text.
ALTER TABLE messages ALTER COLUMN text DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_text_check;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_key_version integer NOT NULL DEFAULT 1;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_meta jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS messages_content_hash_idx ON messages(content_hash);

CREATE TABLE IF NOT EXISTS message_device_keys (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_device_id text NOT NULL REFERENCES chat_devices(device_id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id,recipient_device_id)
);
CREATE INDEX IF NOT EXISTS message_device_keys_device_idx ON message_device_keys(recipient_device_id,created_at DESC);

CREATE TABLE IF NOT EXISTS message_attachment_keys (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_device_id text NOT NULL REFERENCES chat_devices(device_id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id,recipient_device_id)
);
CREATE INDEX IF NOT EXISTS message_attachment_keys_device_idx ON message_attachment_keys(recipient_device_id,created_at DESC);

-- Admin 2.0: TOTP 2FA enrollment. Secrets are encrypted/hashed by the application layer;
-- only the encrypted secret is stored here.
CREATE TABLE IF NOT EXISTS admin_2fa (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_enc text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  enabled_at timestamptz,
  last_used_step bigint
);
CREATE INDEX IF NOT EXISTS admin_2fa_enabled_idx ON admin_2fa(enabled,user_id);

-- Admin sessions gain explicit authentication method metadata.
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'password';
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_ip_hash text;
CREATE INDEX IF NOT EXISTS admin_sessions_last_seen_idx ON admin_sessions(last_seen_at DESC);

-- Security lab / admin operations.
CREATE INDEX IF NOT EXISTS login_attempts_created_idx ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_created_idx ON admin_audit_logs(admin_user_id,created_at DESC);

-- Cleanup revoked/expired device records only when they are old; messages remain immutable.
DELETE FROM admin_sessions WHERE expires_at < now();
