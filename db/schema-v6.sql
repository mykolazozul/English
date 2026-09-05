-- English Flow v6: E2E chat + PWA/offline support. Run AFTER schema-v5.sql.
CREATE TABLE IF NOT EXISTS chat_devices (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL UNIQUE,
  public_key jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ciphertext text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS iv text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS crypto_version smallint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_device_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_device_id text;
CREATE INDEX IF NOT EXISTS chat_devices_updated_idx ON chat_devices(updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_e2e_pair_idx ON messages(sender_id,recipient_id,created_at DESC);
