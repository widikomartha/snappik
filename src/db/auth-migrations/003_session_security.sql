CREATE TABLE public.owner_session_security (
 session_id uuid PRIMARY KEY REFERENCES snappik_auth.session(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id),
 security_version integer NOT NULL CHECK(security_version>=1), revoked_at timestamptz,
 mfa_verified_at timestamptz, mfa_method text CHECK(mfa_method IN ('totp','backup_code')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((mfa_verified_at IS NULL)=(mfa_method IS NULL))
);
CREATE INDEX owner_session_user ON public.owner_session_security(user_id);
REVOKE ALL ON ALL TABLES IN SCHEMA snappik_auth FROM PUBLIC;
REVOKE ALL ON public.owner_session_security FROM PUBLIC;
