-- Apply after foundation/onboarding grants to a reviewed trusted web service role.
-- No DDL, role grants, app membership reassignment, or security-metadata repointing.
GRANT USAGE ON SCHEMA snappik_auth TO :"runtime_role";
GRANT SELECT ON snappik_auth.schema_migrations TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON snappik_auth."user",snappik_auth.session,
 snappik_auth.account,snappik_auth.verification,snappik_auth."twoFactor" TO :"runtime_role";
GRANT SELECT,INSERT ON public.owner_session_security TO :"runtime_role";
GRANT UPDATE(revoked_at,mfa_verified_at,mfa_method) ON public.owner_session_security TO :"runtime_role";
GRANT UPDATE(updated_at) ON public.users TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON snappik_auth.recovery_requests,snappik_auth.password_recovery,snappik_auth.recovery_outbox TO :"runtime_role";
GRANT SELECT,INSERT ON snappik_auth.admission_policy TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON snappik_auth.admission_bucket TO :"runtime_role";
