-- Apply after runtime-grants.sql with a reviewed, existing service role.
-- Trusted server service access; these grants do not implement RLS.
GRANT INSERT ON users,studios,studio_members,studio_settings,entitlement_grants TO :"runtime_role";
GRANT UPDATE(name,slug,status,updated_at) ON studios TO :"runtime_role";
GRANT UPDATE(locale,timezone,revision,updated_at) ON studio_settings TO :"runtime_role";
-- No auth-owned schema, role self-grant, membership reassignment or trial update/delete.
