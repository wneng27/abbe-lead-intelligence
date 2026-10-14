/*
# Tighten users table RLS — prevent admin role self-assignment

## Summary
Replaces the broad `WITH CHECK (true)` policies on the `users` table with
role-aware policies that prevent any authenticated user from assigning
the `administrator` role to themselves or others via public signup or
direct API calls.

## Changes

### INSERT policy (replaces `auth_insert_users`)
Old: `WITH CHECK (true)` — any authenticated user could insert any role.
New: `WITH CHECK (role IN ('sales_leader', 'account_manager'))` —
public signup can only create sales_leader or account_manager accounts.
Administrator profiles can only be inserted via the Supabase Dashboard
SQL Editor (service role bypasses RLS).

### UPDATE policy (replaces `auth_update_users`)
Old: `USING (true) WITH CHECK (true)` — any authenticated user could
update any row and set any role.
New:
  USING: admin can update any row; non-admin can update only their own row.
  WITH CHECK: admin can set any role on any row; non-admin can update
  only their own row and cannot set role to 'administrator'.

### SELECT, DELETE policies
Unchanged — already correct (authenticated-only).

## Security Impact
- Prevents privilege escalation via public signup.
- Prevents privilege escalation via direct Supabase API INSERT/UPDATE.
- Admin users created via Dashboard SQL Editor are unaffected (service role bypasses RLS).
- Existing admin functionality (deactivate/reactivate users, grant/revoke access) preserved
  because admins retain full UPDATE access on all rows.
- No tables dropped, no data lost, no columns changed.
*/

-- ──────────────────────────────────────────────
-- INSERT: only sales_leader or account_manager via public signup
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_users" ON users;

CREATE POLICY "auth_insert_users" ON users FOR INSERT
  TO authenticated
  WITH CHECK (role IN ('sales_leader', 'account_manager'));

-- ──────────────────────────────────────────────
-- UPDATE: admin can update anyone; users can update only own non-admin role
-- ──────────────────────────────────────────────
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
    OR (auth.uid() = users.auth_user_id AND role <> 'administrator')
  );
