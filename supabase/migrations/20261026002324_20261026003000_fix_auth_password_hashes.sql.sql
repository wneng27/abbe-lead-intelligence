/*
# Fix auth user password hashes

## Problem
The previous repair migration created auth.users and auth.identities rows
correctly, but the password was hashed using PostgreSQL's crypt() function
with gen_salt('bf'). GoTrue (Supabase's auth service, written in Go) uses
golang.org/x/crypto/bcrypt for password verification, which is not compatible
with PostgreSQL's crypt() bcrypt implementation.

## What this migration does
1. Updates the encrypted_password column for all 12 auth.users rows with a
   GoTrue-compatible bcrypt hash ($2b$ format from bcryptjs, which is
   compatible with Go's bcrypt library).
2. The password for all accounts is: ABBE2026!

## Security
- No schema changes, no RLS changes.
- Only the password hash is updated; all other auth user fields remain intact.
*/

UPDATE auth.users
SET encrypted_password = '$2b$10$Q93gxO2WrW84Bxe/YpH/HuN4h1vO1XP3fFq3YhobyCb8WFKauM4Je',
    updated_at = now()
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
