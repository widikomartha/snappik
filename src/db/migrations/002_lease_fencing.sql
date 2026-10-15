-- Additive expansion: older readers can still read their original columns.
ALTER TABLE jobs ADD COLUMN lease_token bigint NOT NULL DEFAULT 0 CHECK(lease_token>=0);
-- Never run a pre-fencing worker against this queue.
UPDATE schema_compatibility SET minimum_runtime=2 WHERE singleton;
