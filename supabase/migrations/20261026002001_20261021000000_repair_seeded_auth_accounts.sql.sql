/*
# Repair seeded auth accounts

## Problem
The original auth-user-creation migrations created `auth.users` rows via direct
`INSERT INTO auth.users (...)` with `crypt()` for password hashing. This produced
rows that lack matching `auth.identities` entries, so GoTrue cannot authenticate
any of them — every login returns `invalid_credentials`. One account
(sarah.chen) has an identity but a `crypt()`-hashed password that GoTrue cannot
verify, and her profile name was corrupted to "sarah.chen" by the relink
migration.

## What this migration does
1. Deletes the 11 broken `auth.users` rows that have no `auth.identities` entry
   (these are non-functional — no one can sign in with them).
2. Deletes sarah.chen's auth account (broken password hash + unverified email).
3. Recreates ALL 12 auth accounts using `auth.create_user()`, which correctly
   creates both `auth.users` and `auth.identities` rows with a GoTrue-compatible
   bcrypt password hash and email confirmation set to true.
4. Updates `auth_user_id` in `public.users` to point to the new auth user IDs.
5. Restores sarah.chen's display name to "Sarah Chen".
6. Cleans up the temporary test_probe auth account.

## Password
All accounts are set to: ABBE2026!

## Security
- No RLS policy changes.
- No schema changes.
- Profile data (roles, departments, access grants) is preserved — only
  `auth_user_id` and `name` (for sarah.chen) are updated.
*/

DO $$
DECLARE
  u RECORD;
  new_auth_uid uuid;
BEGIN
  -- Step 1: Delete ALL existing broken auth accounts for seeded users
  -- These were created via direct INSERT and lack auth.identities rows
  DELETE FROM auth.users
  WHERE email IN (
    'sarah.chen@abbe.com',
    'michael.rodriguez@abbe.com',
    'jennifer.park@abbe.com',
    'david.thompson@abbe.com',
    'robert.lee@abbe.com',
    'emma.wilson@abbe.com',
    'james.murphy@abbe.com',
    'lisa.garcia@abbe.com',
    'alex.kumar@abbe.com',
    'natalie.ross@abbe.com',
    'thomas.baker@abbe.com',
    'sophie.martin@abbe.com'
  );

  -- Also clean up the temporary test account
  DELETE FROM auth.users WHERE email = 'test_probe@abbe.com';

  -- Step 2: Recreate all 12 auth accounts properly using auth.create_user()
  FOR u IN SELECT email, name FROM users ORDER BY email
  LOOP
    BEGIN
      new_auth_uid := auth.create_user(
        email := u.email,
        password := 'ABBE2026!',
        email_confirm := true,
        raw_user_meta_data := jsonb_build_object('name', u.name)
      );
    EXCEPTION WHEN OTHERS THEN
      -- If create_user fails (e.g. user still exists somehow), skip
      RAISE NOTICE 'Could not create auth user for %: %', u.email, SQLERRM;
      CONTINUE;
    END;

    -- Link the new auth_user_id back to the profile row
    UPDATE users SET auth_user_id = new_auth_uid WHERE email = u.email;
    RAISE NOTICE 'Repaired auth for % -> %', u.email, new_auth_uid;
  END LOOP;

  -- Step 3: Restore sarah.chen's correct display name
  UPDATE users SET name = 'Sarah Chen' WHERE email = 'sarah.chen@abbe.com';
END $$;
