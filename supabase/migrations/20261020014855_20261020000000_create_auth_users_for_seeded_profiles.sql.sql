-- Create Supabase Auth accounts for all seeded profile users and link auth_user_id.
-- Password for all prototype accounts: ABBE2026!

DO $$
DECLARE
  u RECORD;
  auth_uid uuid;
BEGIN
  FOR u IN SELECT id, email, name FROM users WHERE auth_user_id IS NULL ORDER BY created_at
  LOOP
    -- Create auth user if it doesn't already exist
    BEGIN
      auth_uid := auth.create_user(
        email := u.email,
        password := 'ABBE2026!',
        email_confirm := true,
        raw_user_meta_data := jsonb_build_object('name', u.name)
      );
    EXCEPTION WHEN OTHERS THEN
      -- User may already exist in auth.users; try to find them
      SELECT id INTO auth_uid FROM auth.users WHERE email = u.email LIMIT 1;
      IF auth_uid IS NULL THEN
        RAISE NOTICE 'Could not create or find auth user for %', u.email;
        CONTINUE;
      END IF;
    END;

    -- Link the auth_user_id back to the profile row
    UPDATE users SET auth_user_id = auth_uid WHERE id = u.id;
    RAISE NOTICE 'Linked % -> %', u.email, auth_uid;
  END LOOP;
END $$;
