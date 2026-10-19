-- Additive only: no existing credentials, sessions or user rows are rewritten.
CREATE TABLE snappik_auth.recovery_requests (
 request_hash text PRIMARY KEY CHECK(length(request_hash)=64),
 address_hash text NOT NULL CHECK(length(address_hash)=64),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX recovery_requests_address_time ON snappik_auth.recovery_requests(address_hash,created_at);
CREATE TABLE snappik_auth.password_recovery (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 user_id uuid REFERENCES snappik_auth."user"(id) ON DELETE CASCADE, -- null: indistinguishable unknown-account receipt
 expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '15 minutes'),
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX password_recovery_user ON snappik_auth.password_recovery(user_id);
CREATE TABLE snappik_auth.recovery_outbox (
 id uuid PRIMARY KEY,
 token_hash text NOT NULL UNIQUE REFERENCES snappik_auth.password_recovery(token_hash) ON DELETE CASCADE,
 payload text, -- v1 AES-256-GCM ciphertext; never a plaintext token, URL or recipient
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','completed','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_id uuid,
 lease_until timestamptz,
 error_code text CHECK(error_code IN ('DELIVERY_FAILED','LEASE_EXPIRED','TOKEN_EXPIRED')),
 delivery_mode text CHECK(delivery_mode IN ('synthetic')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 finished_at timestamptz,
 CHECK((state='running' AND lease_id IS NOT NULL AND lease_until IS NOT NULL) OR
       (state<>'running' AND lease_id IS NULL AND lease_until IS NULL)),
 CHECK((state IN ('queued','running'))=(payload IS NOT NULL)),
 CHECK(state<>'queued' OR attempts<3),
 CHECK(state<>'running' OR attempts>=1)
);
CREATE INDEX recovery_outbox_ready ON snappik_auth.recovery_outbox(available_at) WHERE state IN ('queued','running');
REVOKE ALL ON snappik_auth.recovery_requests,snappik_auth.password_recovery,snappik_auth.recovery_outbox FROM PUBLIC;
