-- Stop on ANY duplicate, even within one user. Never guess a survivor or merge identities.
-- Lock excludes concurrent account writes between preflight and constraint creation.
LOCK TABLE snappik_auth.account IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM snappik_auth.account GROUP BY "providerId","accountId" HAVING count(*)>1) THEN
  RAISE EXCEPTION 'AUTH_ACCOUNT_DUPLICATES_REQUIRE_REVIEW' USING ERRCODE='23505';
 END IF;
END $$;
ALTER TABLE snappik_auth.account ADD CONSTRAINT account_provider_subject_key UNIQUE("providerId","accountId");
