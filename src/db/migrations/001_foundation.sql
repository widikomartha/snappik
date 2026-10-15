CREATE TABLE schema_compatibility (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), minimum_runtime integer NOT NULL CHECK(minimum_runtime>=1)
);
INSERT INTO schema_compatibility(singleton,minimum_runtime) VALUES(true,1);
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_provider text NOT NULL, auth_subject text NOT NULL,
 email_normalized text NOT NULL, display_name text NOT NULL, security_version integer NOT NULL DEFAULT 1 CHECK(security_version>=1),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(auth_provider,auth_subject)
);
CREATE TABLE studios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text UNIQUE, revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 status text NOT NULL DEFAULT 'setup_required' CHECK(status IN ('setup_required','active','suspended')),
 provisioned_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(name IS NULL OR char_length(name) BETWEEN 1 AND 100),
 CHECK(slug IS NULL OR (char_length(slug) BETWEEN 3 AND 50 AND slug ~ '^[a-z0-9-]+$')),
 CHECK(status<>'active' OR (name IS NOT NULL AND slug IS NOT NULL))
);
CREATE TABLE studio_members (
 studio_id uuid NOT NULL REFERENCES studios, user_id uuid NOT NULL REFERENCES users,
 role text NOT NULL DEFAULT 'owner' CHECK(role='owner'), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(studio_id,user_id), UNIQUE(studio_id), UNIQUE(user_id)
);
CREATE TABLE studio_settings (
 studio_id uuid PRIMARY KEY REFERENCES studios, locale text NOT NULL CHECK(locale IN ('id','en')), timezone text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1), defaults_schema_version integer NOT NULL CHECK(defaults_schema_version>=1),
 project_defaults jsonb NOT NULL CHECK(jsonb_typeof(project_defaults)='object'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE entitlement_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios, source text NOT NULL CHECK(source IN ('trial','manual')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, project_limit integer NOT NULL CHECK(project_limit>=1), revoked_at timestamptz,
 source_ref text NOT NULL, granted_by uuid REFERENCES users, reason text, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at), CHECK(source<>'manual' OR (granted_by IS NOT NULL AND length(trim(reason))>0 AND reason IS NOT NULL)), UNIQUE(studio_id,source,source_ref)
);
CREATE UNIQUE INDEX one_trial ON entitlement_grants(studio_id) WHERE source='trial';
CREATE INDEX active_grants ON entitlement_grants(studio_id,starts_at,ends_at) WHERE revoked_at IS NULL;
CREATE TABLE platform_roles (
 user_id uuid NOT NULL REFERENCES users, permission text NOT NULL CHECK(permission IN ('diagnostics_read','entitlement_write','studio_suspend')),
 created_at timestamptz NOT NULL DEFAULT now(), granted_by uuid REFERENCES users, PRIMARY KEY(user_id,permission)
);
CREATE TABLE projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios, public_token text NOT NULL UNIQUE CHECK(length(public_token)=32),
 access_version integer NOT NULL DEFAULT 1 CHECK(access_version>=1), client_label text NOT NULL CHECK(char_length(client_label) BETWEEN 1 AND 100),
 client_phone text, admin_phone text, drive_folder_id text NOT NULL, detect_subfolders boolean NOT NULL, cover_photo_id uuid,
 notes_enabled boolean NOT NULL, layout text NOT NULL CHECK(layout IN ('grid','masonry')), revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 inventory_status text NOT NULL DEFAULT 'pending' CHECK(inventory_status IN ('pending','ready','failed')), inventory_generation uuid,
 last_successful_sync_at timestamptz, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(studio_id,id)
);
CREATE INDEX project_list ON projects(studio_id,archived_at,created_at DESC);
CREATE TABLE project_workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL, project_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('main','download')),
 enabled boolean NOT NULL, quota integer, expires_at timestamptz, password_hash text, access_version integer NOT NULL DEFAULT 1 CHECK(access_version>=1),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(studio_id,project_id) REFERENCES projects(studio_id,id), UNIQUE(project_id,kind), UNIQUE(studio_id,project_id,id), UNIQUE(studio_id,project_id,id,kind),
 CHECK((kind='download' AND quota IS NULL) OR (kind='main' AND (quota IS NULL OR quota BETWEEN 1 AND 500) AND (NOT enabled OR quota IS NOT NULL)))
);
CREATE INDEX workflow_expiry ON project_workflows(studio_id,expires_at) WHERE enabled;
CREATE TABLE project_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL, project_id uuid NOT NULL, provider_file_id text NOT NULL,
 filename text NOT NULL, folder_path text NOT NULL, mime_type text NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes>=0), source_version text NOT NULL,
 available boolean NOT NULL, seen_generation uuid NOT NULL, derived_asset_key text, last_seen_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(studio_id,project_id) REFERENCES projects(studio_id,id), UNIQUE(project_id,provider_file_id), UNIQUE(studio_id,project_id,id)
);
CREATE INDEX photo_list ON project_photos(project_id,available,folder_path,filename,id);
ALTER TABLE projects ADD CONSTRAINT cover_same_project FOREIGN KEY(studio_id,id,cover_photo_id) REFERENCES project_photos(studio_id,project_id,id);
CREATE TABLE selection_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL, project_id uuid NOT NULL, workflow_id uuid NOT NULL, workflow_kind text NOT NULL DEFAULT 'main' CHECK(workflow_kind='main'),
 status text NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','selecting','confirmed')), revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 current_confirmation_id uuid, updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(studio_id,project_id,workflow_id,workflow_kind) REFERENCES project_workflows(studio_id,project_id,id,kind), UNIQUE(project_id,workflow_id), UNIQUE(studio_id,project_id,id)
);
CREATE INDEX selection_status ON selection_sets(studio_id,status,updated_at DESC);
CREATE TABLE selection_items (
 studio_id uuid NOT NULL, project_id uuid NOT NULL, selection_set_id uuid NOT NULL, photo_id uuid NOT NULL,
 note text CHECK(char_length(note)<=500), selected_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(selection_set_id,photo_id),
 FOREIGN KEY(studio_id,project_id,selection_set_id) REFERENCES selection_sets(studio_id,project_id,id),
 FOREIGN KEY(studio_id,project_id,photo_id) REFERENCES project_photos(studio_id,project_id,id)
);
CREATE TABLE selection_confirmations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL, project_id uuid NOT NULL, selection_set_id uuid NOT NULL,
 confirmed_revision integer NOT NULL CHECK(confirmed_revision>=1), actor_kind text NOT NULL CHECK(actor_kind IN ('client','owner')),
 actor_reference text NOT NULL, snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='array'), confirmed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(studio_id,project_id,selection_set_id) REFERENCES selection_sets(studio_id,project_id,id), UNIQUE(selection_set_id,confirmed_revision), UNIQUE(selection_set_id,id)
);
ALTER TABLE selection_sets ADD CONSTRAINT current_snapshot_same_set FOREIGN KEY(id,current_confirmation_id) REFERENCES selection_confirmations(selection_set_id,id) DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX confirmation_history ON selection_confirmations(selection_set_id,confirmed_at DESC);
CREATE TABLE gallery_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'), studio_id uuid NOT NULL, project_id uuid NOT NULL, workflow_id uuid NOT NULL,
 project_access_version integer NOT NULL CHECK(project_access_version>=1), workflow_access_version integer NOT NULL CHECK(workflow_access_version>=1),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(studio_id,project_id,workflow_id) REFERENCES project_workflows(studio_id,project_id,id)
);
CREATE INDEX gallery_expiry ON gallery_sessions(expires_at);
CREATE TABLE jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid REFERENCES studios, project_id uuid,
 kind text NOT NULL CHECK(kind IN ('inventory_scan','thumbnail_generate','project_purge','cache_cleanup','expired_session_cleanup','retention_cleanup')),
 dedupe_key text NOT NULL CHECK(length(dedupe_key) BETWEEN 1 AND 200), payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND payload @> '{"version":1}' AND octet_length(payload::text)<=8192),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed')), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 6),
 available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, worker_id uuid, result jsonb, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 CHECK(project_id IS NULL OR studio_id IS NOT NULL), FOREIGN KEY(studio_id,project_id) REFERENCES projects(studio_id,id),
 CHECK((state='running' AND lease_until IS NOT NULL AND worker_id IS NOT NULL) OR (state<>'running' AND lease_until IS NULL AND worker_id IS NULL))
);
CREATE UNIQUE INDEX active_job_dedupe ON jobs(kind,dedupe_key) WHERE state IN ('queued','running');
CREATE INDEX ready_jobs ON jobs(state,available_at);
CREATE INDEX expired_leases ON jobs(lease_until) WHERE state='running';
CREATE TABLE idempotency_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL, key text NOT NULL CHECK(key ~ '^[ -~]{16,128}$'), request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'in_progress' CHECK(state IN ('in_progress','completed')), response_status integer, response_body jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours', UNIQUE(scope,key),
 CHECK((state='in_progress' AND response_status IS NULL AND response_body IS NULL) OR (state='completed' AND response_status BETWEEN 200 AND 299 AND response_body IS NOT NULL))
);
CREATE INDEX idempotency_expiry ON idempotency_keys(expires_at);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid REFERENCES studios, project_id uuid, actor_kind text NOT NULL CHECK(actor_kind IN ('owner','client','operator','worker')),
 actor_id uuid, action text NOT NULL, target_type text NOT NULL, target_id uuid NOT NULL, reason text, before_summary jsonb, after_summary jsonb,
 request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(project_id IS NULL OR studio_id IS NOT NULL), FOREIGN KEY(studio_id,project_id) REFERENCES projects(studio_id,id)
);
CREATE INDEX studio_audit ON audit_events(studio_id,created_at DESC);
CREATE INDEX request_audit ON audit_events(request_id);
CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable record' USING ERRCODE='55000'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER confirmation_immutable BEFORE UPDATE ON selection_confirmations FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
