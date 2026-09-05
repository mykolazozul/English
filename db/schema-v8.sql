-- English Flow v2.5.0 / Admin WebAuthn migration. Run AFTER schema-v7.sql.
CREATE TABLE IF NOT EXISTS admin_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_type text,
  backed_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_passkeys_user_idx ON admin_passkeys(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS admin_webauthn_challenges (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('registration','authentication')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_webauthn_challenge_expiry_idx ON admin_webauthn_challenges(expires_at);
DELETE FROM admin_webauthn_challenges WHERE expires_at < now();
