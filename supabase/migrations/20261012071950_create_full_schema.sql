/*
# ABBE Lead Intelligence & Screening — Full Schema

## Summary
Creates all tables required by the application from scratch on the new Supabase project.
This migration is idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) so it is safe to re-run.

## Tables Created
1. `departments` — Sales departments (e.g. "Enterprise", "SMB")
2. `users` — App user profiles linked to Supabase Auth accounts
3. `companies` — Company records imported by n8n or manually
4. `contacts` — Contacts associated with a company
5. `sources` — External data sources
6. `source_registry` — Registry of source integrations
7. `signals` — Buying signals detected for a company
8. `evidence` — Evidence items linked to an opportunity
9. `opportunities` — Lead/opportunity records (core entity)
10. `opportunity_sources` — Join table: opportunity ↔ source
11. `reviews` — Account manager review records for an opportunity
12. `activity_log` — Audit trail of all user actions
13. `crm_nominations` — Records of opportunities nominated to CRM
14. `existing_accounts` — Known existing customer accounts
15. `system_settings` — Key/value config (e.g. access duration hours)

## Security
- RLS enabled on every table.
- All tables are organizational-shared data (all authenticated users need full read access,
  writes are scoped to authenticated only). This matches the app's multi-role model where
  admins, sales leaders, and account managers all see the same opportunity pool.
- `users` table: any authenticated user can read all users (needed for assignment UI),
  but only admins should write — the app controls this at the application layer while
  RLS ensures unauthenticated access is blocked entirely.

## Notes
- `auth_user_id` on `users` links to Supabase Auth — populated when a user signs up via the app.
- The app's `signUp` flow inserts the `users` row immediately after Supabase Auth signup.
- n8n workflow writes to `companies`, `opportunities`, and related tables via service role key
  (bypasses RLS), so no special anon policies are needed for those writes.
*/

-- ──────────────────────────────────────────────
-- 1. DEPARTMENTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_departments" ON departments;
CREATE POLICY "auth_select_departments" ON departments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_departments" ON departments;
CREATE POLICY "auth_insert_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_departments" ON departments;
CREATE POLICY "auth_update_departments" ON departments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_departments" ON departments;
CREATE POLICY "auth_delete_departments" ON departments FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 2. USERS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email               text NOT NULL UNIQUE,
  name                text NOT NULL,
  role                text NOT NULL CHECK (role IN ('administrator', 'sales_leader', 'account_manager')),
  department_id       uuid REFERENCES departments(id) ON DELETE SET NULL,
  active              boolean NOT NULL DEFAULT true,
  access_granted_at   timestamptz,
  access_expires_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_users" ON users;
CREATE POLICY "auth_select_users" ON users FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_users" ON users;
CREATE POLICY "auth_insert_users" ON users FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_users" ON users;
CREATE POLICY "auth_update_users" ON users FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_users" ON users;
CREATE POLICY "auth_delete_users" ON users FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 3. COMPANIES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,
  industry      text,
  location      text,
  domain        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_companies" ON companies;
CREATE POLICY "auth_select_companies" ON companies FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_companies" ON companies;
CREATE POLICY "auth_insert_companies" ON companies FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_companies" ON companies;
CREATE POLICY "auth_update_companies" ON companies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_companies" ON companies;
CREATE POLICY "auth_delete_companies" ON companies FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 4. CONTACTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  phone         text,
  linkedin_url  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_contacts" ON contacts;
CREATE POLICY "auth_select_contacts" ON contacts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_contacts" ON contacts;
CREATE POLICY "auth_insert_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_contacts" ON contacts;
CREATE POLICY "auth_update_contacts" ON contacts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_contacts" ON contacts;
CREATE POLICY "auth_delete_contacts" ON contacts FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 5. SOURCES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name  text NOT NULL,
  source_type  text NOT NULL,
  source_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_sources" ON sources;
CREATE POLICY "auth_select_sources" ON sources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sources" ON sources;
CREATE POLICY "auth_insert_sources" ON sources FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sources" ON sources;
CREATE POLICY "auth_update_sources" ON sources FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sources" ON sources;
CREATE POLICY "auth_delete_sources" ON sources FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 6. SOURCE REGISTRY
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_registry (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name  text NOT NULL,
  source_type  text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz
);

ALTER TABLE source_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_source_registry" ON source_registry;
CREATE POLICY "auth_select_source_registry" ON source_registry FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_source_registry" ON source_registry;
CREATE POLICY "auth_insert_source_registry" ON source_registry FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_source_registry" ON source_registry;
CREATE POLICY "auth_update_source_registry" ON source_registry FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_source_registry" ON source_registry;
CREATE POLICY "auth_delete_source_registry" ON source_registry FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 7. SIGNALS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  signal_type         text NOT NULL,
  signal_description  text,
  signal_date         date,
  confidence          text CHECK (confidence IN ('high', 'medium', 'low')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_signals" ON signals;
CREATE POLICY "auth_select_signals" ON signals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_signals" ON signals;
CREATE POLICY "auth_insert_signals" ON signals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_signals" ON signals;
CREATE POLICY "auth_update_signals" ON signals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_signals" ON signals;
CREATE POLICY "auth_delete_signals" ON signals FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 8. OPPORTUNITIES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'new' CHECK (status IN (
                        'new','assigned_to_dept','dept_viewed','assigned_to_am',
                        'in_review','reviewed','ready_for_admin','nominated',
                        'returned_for_review','not_nominatable','deferred',
                        'sla_breached','reassigned','archived'
                      )),
  priority            text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  department_id       uuid REFERENCES departments(id) ON DELETE SET NULL,
  sales_leader_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  account_manager_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  fit_score           text CHECK (fit_score IN ('strong','moderate','weak','unknown')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_opportunities" ON opportunities;
CREATE POLICY "auth_select_opportunities" ON opportunities FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_opportunities" ON opportunities;
CREATE POLICY "auth_insert_opportunities" ON opportunities FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_opportunities" ON opportunities;
CREATE POLICY "auth_update_opportunities" ON opportunities FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_opportunities" ON opportunities;
CREATE POLICY "auth_delete_opportunities" ON opportunities FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 9. EVIDENCE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_id       uuid REFERENCES sources(id) ON DELETE SET NULL,
  source_url      text,
  excerpt         text,
  confidence      text CHECK (confidence IN ('high', 'medium', 'low')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_evidence" ON evidence;
CREATE POLICY "auth_select_evidence" ON evidence FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_evidence" ON evidence;
CREATE POLICY "auth_insert_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_evidence" ON evidence;
CREATE POLICY "auth_update_evidence" ON evidence FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_evidence" ON evidence;
CREATE POLICY "auth_delete_evidence" ON evidence FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 10. OPPORTUNITY SOURCES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunity_sources (
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_id       uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, source_id)
);

ALTER TABLE opportunity_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_select_opportunity_sources" ON opportunity_sources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_insert_opportunity_sources" ON opportunity_sources FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_delete_opportunity_sources" ON opportunity_sources FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 11. REVIEWS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  reviewer_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  review_status   text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','in_progress','approved','rejected','returned')),
  disposition     text,
  comments        text,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_reviews" ON reviews;
CREATE POLICY "auth_select_reviews" ON reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_reviews" ON reviews;
CREATE POLICY "auth_update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;
CREATE POLICY "auth_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 12. ACTIVITY LOG
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  opportunity_id  uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  timestamp       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_activity_log" ON activity_log;
CREATE POLICY "auth_select_activity_log" ON activity_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_activity_log" ON activity_log;
CREATE POLICY "auth_insert_activity_log" ON activity_log FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_activity_log" ON activity_log;
CREATE POLICY "auth_update_activity_log" ON activity_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_activity_log" ON activity_log;
CREATE POLICY "auth_delete_activity_log" ON activity_log FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 13. CRM NOMINATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_nominations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  nominated_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'nominated',
  comments        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_nominations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_select_crm_nominations" ON crm_nominations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_insert_crm_nominations" ON crm_nominations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_update_crm_nominations" ON crm_nominations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_delete_crm_nominations" ON crm_nominations FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 14. EXISTING ACCOUNTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS existing_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE existing_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_select_existing_accounts" ON existing_accounts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_insert_existing_accounts" ON existing_accounts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_update_existing_accounts" ON existing_accounts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_delete_existing_accounts" ON existing_accounts FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 15. SYSTEM SETTINGS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key    text NOT NULL UNIQUE,
  setting_value  text,
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_system_settings" ON system_settings;
CREATE POLICY "auth_select_system_settings" ON system_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_system_settings" ON system_settings;
CREATE POLICY "auth_insert_system_settings" ON system_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_system_settings" ON system_settings;
CREATE POLICY "auth_update_system_settings" ON system_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_system_settings" ON system_settings;
CREATE POLICY "auth_delete_system_settings" ON system_settings FOR DELETE
  TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- SEED: default system setting
-- ──────────────────────────────────────────────
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('sales_leader_access_duration_hours', '24', 'How long (in hours) a sales leader''s access grant lasts')
ON CONFLICT (setting_key) DO NOTHING;

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id    ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_opportunities_status  ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_ts       ON activity_log(timestamp DESC);
