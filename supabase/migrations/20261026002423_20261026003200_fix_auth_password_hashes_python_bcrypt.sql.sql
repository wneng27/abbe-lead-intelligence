/*
# Fix auth user password hashes with Python bcrypt $2a$

## Problem
Previous attempts used bcryptjs-generated hashes. Python's bcrypt library
uses the same C bcrypt implementation that Go's golang.org/x/crypto/bcrypt
is based on, so the hash format should be fully compatible.

## What this migration does
Updates encrypted_password for all 12 auth users with a Python bcrypt $2a$ hash.
Password: ABBE2026!
*/

UPDATE auth.users
SET encrypted_password = '$2a$10$Xj4yPMZfutuC9NT5mLNgPO9Hq7p35cPp6lb0ITJ2H4I0EAvdlEfJe',
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
