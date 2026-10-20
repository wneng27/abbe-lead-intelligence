-- Re-link existing auth accounts to profile rows in the users table.
-- Auth accounts already exist with their own passwords; we just need the profile rows.

DO $$
DECLARE
  a RECORD;
  dept_id uuid;
  user_role text;
  user_name text;
BEGIN
  FOR a IN SELECT id, email, raw_user_meta_data FROM auth.users ORDER BY created_at
  LOOP
    -- Determine name from auth metadata, fallback to email prefix
    user_name := COALESCE(a.raw_user_meta_data->>'name', split_part(a.email, '@', 1));

    -- Assign role: sarah.chen and michael.rodriguez are admins, 
    -- jennifer/david/robert are sales_leaders, rest are account_managers
    user_role := CASE
      WHEN a.email IN ('sarah.chen@abbe.com', 'michael.rodriguez@abbe.com') THEN 'administrator'
      WHEN a.email IN ('jennifer.park@abbe.com', 'david.thompson@abbe.com', 'robert.lee@abbe.com') THEN 'sales_leader'
      ELSE 'account_manager'
    END;

    -- Assign department
    dept_id := CASE
      WHEN a.email IN ('jennifer.park@abbe.com', 'emma.wilson@abbe.com', 'james.murphy@abbe.com', 'lisa.garcia@abbe.com') THEN 'a0000000-0000-0000-0000-000000000001'
      WHEN a.email IN ('david.thompson@abbe.com', 'alex.kumar@abbe.com', 'natalie.ross@abbe.com') THEN 'a0000000-0000-0000-0000-000000000002'
      WHEN a.email IN ('robert.lee@abbe.com', 'thomas.baker@abbe.com', 'sophie.martin@abbe.com') THEN 'a0000000-0000-0000-0000-000000000003'
      ELSE NULL
    END;

    -- Insert profile row linked to the auth account
    INSERT INTO users (email, name, role, department_id, auth_user_id, active, created_at, updated_at)
    VALUES (a.email, user_name, user_role, dept_id, a.id, true, now(), now())
    ON CONFLICT (email) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      department_id = EXCLUDED.department_id,
      active = true;

    RAISE NOTICE 'Linked profile for %', a.email;
  END LOOP;
END $$;
