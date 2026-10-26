/*
# Repair seeded auth accounts (second attempt)

## Problem
The first repair migration deleted the broken auth.users rows but auth.create_user()
does not exist in this Supabase version, so no new accounts were created.
All 12 users now have auth_user_id = NULL and cannot sign in.

## What this migration does
1. Creates all 12 auth accounts via direct INSERT INTO auth.users with:
   - bcrypt-hashed password ($2a$ format from crypt/gen_salt)
   - email_confirmed_at set (so no email verification needed)
   - raw_user_meta_data with the user's name
2. Creates matching auth.identities rows for each user (this was the missing
   piece in the original migrations — GoTrue requires identities to authenticate)
3. Updates auth_user_id in public.users to point to the new auth accounts
4. Restores sarah.chen's display name to "Sarah Chen"
*/

DO $$
DECLARE
  u RECORD;
  new_uid uuid;
  bcrypt_hash text;
BEGIN
  -- Generate a bcrypt hash for the password ABBE2026!
  -- gen_salt('bf') produces a $2a$ bcrypt hash compatible with GoTrue
  bcrypt_hash := crypt('ABBE2026!', gen_salt('bf'));

  FOR u IN SELECT email, name FROM users ORDER BY email
  LOOP
    -- Generate a new UUID for this auth user
    new_uid := gen_random_uuid();

    -- Insert into auth.users (confirmed_at and email are generated columns)
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
      updated_at,
      is_sso_user,
      is_anonymous
    ) VALUES (
      new_uid,
      'authenticated',
      'authenticated',
      u.email,
      bcrypt_hash,
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('name', u.name, 'email', u.email, 'email_verified', true, 'phone_verified', false),
      now(),
      now(),
      false,
      false
    );

    -- Insert into auth.identities (email column is generated — derived from identity_data)
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      id
    ) VALUES (
      new_uid::text,
      new_uid,
      jsonb_build_object(
        'sub', new_uid::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now(),
      gen_random_uuid()
    );

    -- Link the new auth_user_id back to the profile row
    UPDATE users SET auth_user_id = new_uid WHERE email = u.email;
    
    RAISE NOTICE 'Created auth account for % -> %', u.email, new_uid;
  END LOOP;

  -- Restore sarah.chen's correct display name
  UPDATE users SET name = 'Sarah Chen' WHERE email = 'sarah.chen@abbe.com';
END $$;
