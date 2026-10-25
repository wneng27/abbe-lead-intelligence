-- Create Supabase Auth accounts for all seeded profile users and link auth_user_id.
-- Password for all prototype accounts: ABBE2026!
-- Uses crypt() with pgcrypto for password hashing (Supabase auth.users expects bcrypt).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  u RECORD;
  auth_uid uuid;
BEGIN
  FOR u IN SELECT id, email, name FROM users WHERE auth_user_id IS NULL ORDER BY created_at
  LOOP
    -- Check if auth user already exists
    SELECT id INTO auth_uid FROM auth.users WHERE email = u.email LIMIT 1;

    IF auth_uid IS NULL THEN
      -- Insert new auth user with bcrypt-hashed password
      INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        u.email,
        crypt('ABBE2026!', gen_salt('bf')),
        now(),
        '{}'::jsonb,
        jsonb_build_object('name', u.name),
        now(),
        now()
      )
      RETURNING id INTO auth_uid;
    END IF;

    -- Link the auth_user_id back to the profile row
    UPDATE users SET auth_user_id = auth_uid WHERE id = u.id;
  END LOOP;
END $$;
