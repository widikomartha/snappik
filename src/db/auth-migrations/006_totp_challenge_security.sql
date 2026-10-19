-- Additive lifecycle receipts; no adoption of existing pending native proofs.
CREATE TABLE snappik_auth.totp_challenge_security (
 challenge_hash text PRIMARY KEY CHECK(challenge_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid NOT NULL REFERENCES public.users(id),
 security_version integer NOT NULL CHECK(security_version>=1),
 expires_at timestamptz NOT NULL,
 session_id uuid UNIQUE REFERENCES snappik_auth.session(id) ON DELETE SET NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX totp_challenge_user ON snappik_auth.totp_challenge_security(user_id);
CREATE INDEX totp_challenge_expiry ON snappik_auth.totp_challenge_security(expires_at);
REVOKE ALL ON snappik_auth.totp_challenge_security FROM PUBLIC;
