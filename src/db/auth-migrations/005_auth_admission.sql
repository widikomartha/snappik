-- Additive: no existing account/session/recovery/business rows are rewritten.
CREATE TABLE snappik_auth.admission_policy (
 namespace text PRIMARY KEY CHECK(length(namespace) BETWEEN 1 AND 64),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$')
);
CREATE TABLE snappik_auth.admission_bucket (
 key_hash text PRIMARY KEY CHECK(key_hash ~ '^[0-9a-f]{64}$'),
 scope text NOT NULL CHECK(scope IN ('global','subject','native')),
 used integer NOT NULL CHECK(used BETWEEN 1 AND 10000),
 expires_at timestamptz NOT NULL
);
CREATE INDEX admission_bucket_expiry ON snappik_auth.admission_bucket(expires_at);
REVOKE ALL ON snappik_auth.admission_policy,snappik_auth.admission_bucket FROM PUBLIC;
