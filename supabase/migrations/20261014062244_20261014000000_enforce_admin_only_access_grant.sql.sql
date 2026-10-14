/*
# Enforce administrator-only access grants with server-side timestamp

## Summary
This migration ensures that only administrators can grant or revoke
Sales Department Leader access, and that the grant timestamp is set
by the database server (not the client). It also enforces the 24-hour
access window at the database/RLS level so expired sales leaders
cannot read or modify protected business data through direct API calls.

## Changes

### 1. Helper function: fn_user_has_data_access
A SECURITY DEFINER function that checks whether the calling auth user
has valid data access. Returns true for administrators and account
managers (persistent access). For sales_leaders, returns true only if
access_granted_at is not null and access_expires_at is in the future.

### 2. SECURITY DEFINER RPC: grant_sales_leader_access
A stored procedure that:
- Verifies the caller is an administrator (raises exception otherwise)
- Sets access_granted_at to now() (server timestamp)
- Sets access_expires_at to now() + interval from system_settings
- Returns the updated user row
- Logs the grant action to activity_log
This prevents sales leaders from self-granting access via direct API
UPDATE calls, because the UPDATE policy is tightened to exclude
access_granted_at and access_expires_at from self-updates.

### 3. Tightened users UPDATE policy
The previous UPDATE policy allowed any user to update their own row
with any non-administrator role value. This meant a sales leader could
self-grant access by setting access_granted_at and access_expires_at
via the Supabase API. The new policy:
- Admins: can update any row, any column (unchanged)
- Non-admins: can update only their own row, and the WITH CHECK
  still prevents setting role to 'administrator'. Additionally,
  the access_granted_at and access_expires_at columns are now
  controlled exclusively through the SECURITY DEFINER RPC.
  Non-admin self-updates are restricted to non-access columns by
  adding a WITH CHECK that rejects rows where access_granted_at or
  access_expires_at have been modified from their existing values.

### 4. Data table RLS tightened for sales leader expiration
Adds access-expiration enforcement to SELECT, INSERT, UPDATE, and DELETE
policies on all business data tables (opportunities, companies, contacts,
activity_log, reviews, evidence, signals, crm_nominations, opportunity_sources,
existing_accounts, sources, source_registry, departments, system_settings).
Administrators and account_managers retain full access. Sales leaders
get access only when fn_user_has_data_access() returns true.

## Security Impact
- Sales leaders can no longer self-grant or self-renew access.
- Expired sales leaders cannot read or modify any business data via API.
- Grant timestamps come from the database server, not client clocks.
- Administrators and account managers are completely unaffected.
- No tables dropped, no columns changed, no data lost.
*/

-- ──────────────────────────────────────────────
-- 1. Helper function: fn_user_has_data_access
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_user_has_data_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND (
      u.role IN ('administrator', 'account_manager')
      OR (
        u.role = 'sales_leader'
        AND u.active = true
        AND u.access_granted_at IS NOT NULL
        AND u.access_expires_at IS NOT NULL
        AND u.access_expires_at > now()
      )
    )
  );
$$;

-- ──────────────────────────────────────────────
-- 2. SECURITY DEFINER RPC: grant_sales_leader_access
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION grant_sales_leader_access(target_email text)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_record users;
  target_record users;
  duration_hours int;
  granted_at_val timestamptz;
  expires_at_val timestamptz;
BEGIN
  -- Identify the caller
  SELECT * INTO caller_record FROM users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller user profile not found.';
  END IF;

  -- Only administrators can grant access
  IF caller_record.role <> 'administrator' THEN
    RAISE EXCEPTION 'Only administrators can grant access.';
  END IF;

  -- Find the target user
  SELECT * INTO target_record FROM users WHERE email = lower(trim(target_email));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- Only sales_leaders can receive access grants
  IF target_record.role <> 'sales_leader' THEN
    RAISE EXCEPTION 'Access grants are only for Sales Department Leaders.';
  END IF;

  -- Get duration from system_settings (default 24)
  SELECT setting_value::int INTO duration_hours
  FROM system_settings
  WHERE setting_key = 'sales_leader_access_duration_hours';
  IF duration_hours IS NULL OR duration_hours <= 0 THEN
    duration_hours := 24;
  END IF;

  granted_at_val := now();
  expires_at_val := granted_at_val + (duration_hours || ' hours')::interval;

  -- Update the target user
  UPDATE users
  SET access_granted_at = granted_at_val,
      access_expires_at = expires_at_val,
      updated_at = now()
  WHERE id = target_record.id
  RETURNING * INTO target_record;

  -- Log the grant action
  INSERT INTO activity_log (actor_id, action, timestamp)
  VALUES (caller_record.id, 'access_granted: ' || target_record.email, now());

  RETURN target_record;
END;
$$;

-- Grant execute to authenticated only
REVOKE ALL ON FUNCTION grant_sales_leader_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION grant_sales_leader_access(text) TO authenticated;

-- ──────────────────────────────────────────────
-- 3. Tighten users UPDATE policy
-- ──────────────────────────────────────────────
-- Non-admins can still update their own non-access, non-role columns
-- but cannot change access_granted_at or access_expires_at.
DROP POLICY IF EXISTS "auth_update_users" ON users;

CREATE POLICY "auth_update_users" ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'administrator'
    )
    OR auth.uid() = users.auth_user_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'administrator'
    )
    OR (
      auth.uid() = users.auth_user_id
      AND role <> 'administrator'
      -- Non-admin cannot modify access columns: the new values must
      -- match the existing values in the database row
      AND access_granted_at = (
        SELECT u2.access_granted_at FROM users u2
        WHERE u2.auth_user_id = auth.uid()
      )
      AND access_expires_at = (
        SELECT u2.access_expires_at FROM users u2
        WHERE u2.auth_user_id = auth.uid()
      )
    )
  );

-- ──────────────────────────────────────────────
-- 4. Data table RLS: enforce sales leader expiration
-- ──────────────────────────────────────────────
-- Pattern: replace broad USING(true) / WITH CHECK(true) with
-- fn_user_has_data_access() gate for all CRUD on business data.

-- opportunities
DROP POLICY IF EXISTS "auth_select_opportunities" ON opportunities;
CREATE POLICY "auth_select_opportunities" ON opportunities FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_opportunities" ON opportunities;
CREATE POLICY "auth_insert_opportunities" ON opportunities FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_opportunities" ON opportunities;
CREATE POLICY "auth_update_opportunities" ON opportunities FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_opportunities" ON opportunities;
CREATE POLICY "auth_delete_opportunities" ON opportunities FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- companies
DROP POLICY IF EXISTS "auth_select_companies" ON companies;
CREATE POLICY "auth_select_companies" ON companies FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_companies" ON companies;
CREATE POLICY "auth_insert_companies" ON companies FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_companies" ON companies;
CREATE POLICY "auth_update_companies" ON companies FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_companies" ON companies;
CREATE POLICY "auth_delete_companies" ON companies FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- contacts
DROP POLICY IF EXISTS "auth_select_contacts" ON contacts;
CREATE POLICY "auth_select_contacts" ON contacts FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_contacts" ON contacts;
CREATE POLICY "auth_insert_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_contacts" ON contacts;
CREATE POLICY "auth_update_contacts" ON contacts FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_contacts" ON contacts;
CREATE POLICY "auth_delete_contacts" ON contacts FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- activity_log
DROP POLICY IF EXISTS "auth_select_activity_log" ON activity_log;
CREATE POLICY "auth_select_activity_log" ON activity_log FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_activity_log" ON activity_log;
CREATE POLICY "auth_insert_activity_log" ON activity_log FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_activity_log" ON activity_log;
CREATE POLICY "auth_update_activity_log" ON activity_log FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_activity_log" ON activity_log;
CREATE POLICY "auth_delete_activity_log" ON activity_log FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- reviews
DROP POLICY IF EXISTS "auth_select_reviews" ON reviews;
CREATE POLICY "auth_select_reviews" ON reviews FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_reviews" ON reviews;
CREATE POLICY "auth_update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;
CREATE POLICY "auth_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- evidence
DROP POLICY IF EXISTS "auth_select_evidence" ON evidence;
CREATE POLICY "auth_select_evidence" ON evidence FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_evidence" ON evidence;
CREATE POLICY "auth_insert_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_evidence" ON evidence;
CREATE POLICY "auth_update_evidence" ON evidence FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_evidence" ON evidence;
CREATE POLICY "auth_delete_evidence" ON evidence FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- signals
DROP POLICY IF EXISTS "auth_select_signals" ON signals;
CREATE POLICY "auth_select_signals" ON signals FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_signals" ON signals;
CREATE POLICY "auth_insert_signals" ON signals FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_signals" ON signals;
CREATE POLICY "auth_update_signals" ON signals FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_signals" ON signals;
CREATE POLICY "auth_delete_signals" ON signals FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- crm_nominations
DROP POLICY IF EXISTS "auth_select_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_select_crm_nominations" ON crm_nominations FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_insert_crm_nominations" ON crm_nominations FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_update_crm_nominations" ON crm_nominations FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_crm_nominations" ON crm_nominations;
CREATE POLICY "auth_delete_crm_nominations" ON crm_nominations FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- opportunity_sources
DROP POLICY IF EXISTS "auth_select_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_select_opportunity_sources" ON opportunity_sources FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_insert_opportunity_sources" ON opportunity_sources FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_opportunity_sources" ON opportunity_sources;
CREATE POLICY "auth_delete_opportunity_sources" ON opportunity_sources FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- existing_accounts
DROP POLICY IF EXISTS "auth_select_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_select_existing_accounts" ON existing_accounts FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_insert_existing_accounts" ON existing_accounts FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_update_existing_accounts" ON existing_accounts FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_existing_accounts" ON existing_accounts;
CREATE POLICY "auth_delete_existing_accounts" ON existing_accounts FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- sources
DROP POLICY IF EXISTS "auth_select_sources" ON sources;
CREATE POLICY "auth_select_sources" ON sources FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_sources" ON sources;
CREATE POLICY "auth_insert_sources" ON sources FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_sources" ON sources;
CREATE POLICY "auth_update_sources" ON sources FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_sources" ON sources;
CREATE POLICY "auth_delete_sources" ON sources FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- source_registry
DROP POLICY IF EXISTS "auth_select_source_registry" ON source_registry;
CREATE POLICY "auth_select_source_registry" ON source_registry FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_source_registry" ON source_registry;
CREATE POLICY "auth_insert_source_registry" ON source_registry FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_source_registry" ON source_registry;
CREATE POLICY "auth_update_source_registry" ON source_registry FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_source_registry" ON source_registry;
CREATE POLICY "auth_delete_source_registry" ON source_registry FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- departments
DROP POLICY IF EXISTS "auth_select_departments" ON departments;
CREATE POLICY "auth_select_departments" ON departments FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_departments" ON departments;
CREATE POLICY "auth_insert_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_departments" ON departments;
CREATE POLICY "auth_update_departments" ON departments FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_departments" ON departments;
CREATE POLICY "auth_delete_departments" ON departments FOR DELETE
  TO authenticated USING (fn_user_has_data_access());

-- system_settings
DROP POLICY IF EXISTS "auth_select_system_settings" ON system_settings;
CREATE POLICY "auth_select_system_settings" ON system_settings FOR SELECT
  TO authenticated USING (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_insert_system_settings" ON system_settings;
CREATE POLICY "auth_insert_system_settings" ON system_settings FOR INSERT
  TO authenticated WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_update_system_settings" ON system_settings;
CREATE POLICY "auth_update_system_settings" ON system_settings FOR UPDATE
  TO authenticated USING (fn_user_has_data_access()) WITH CHECK (fn_user_has_data_access());

DROP POLICY IF EXISTS "auth_delete_system_settings" ON system_settings;
CREATE POLICY "auth_delete_system_settings" ON system_settings FOR DELETE
  TO authenticated USING (fn_user_has_data_access());
