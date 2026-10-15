-- Reviewed operator/migration session only. psql -v runtime_role=chosen_role -f ...
-- The role MUST already exist as a non-owner, non-superuser, non-inheriting role.
-- Never inject MIGRATION_DATABASE_URL into web/worker. No credentials in this file.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT ON schema_migrations,schema_compatibility TO :"runtime_role";
GRANT SELECT ON users,studios,studio_members,studio_settings,entitlement_grants,platform_roles,
 projects,project_workflows,project_photos,selection_sets,selection_items,selection_confirmations,gallery_sessions,audit_events TO :"runtime_role";
GRANT INSERT,UPDATE,DELETE,SELECT ON jobs,idempotency_keys TO :"runtime_role";
GRANT INSERT ON audit_events TO :"runtime_role";
-- PostgreSQL SELECT FOR UPDATE requires UPDATE on at least one column. Limit it
-- to counters / the CHECK-constrained owner role, never membership identity keys.
GRANT UPDATE(security_version) ON users TO :"runtime_role";
GRANT UPDATE(revision) ON studios,projects,selection_sets TO :"runtime_role";
GRANT UPDATE(role) ON studio_members TO :"runtime_role";
-- Business writes and auth namespace grants are intentionally deferred to their
-- reviewed implementations. This foundation role cannot self-grant ops roles,
-- edit membership, migrate, or mutate audit/confirmation history.
