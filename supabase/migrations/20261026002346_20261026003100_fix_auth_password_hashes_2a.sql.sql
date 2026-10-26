/*
# Fix auth user password hashes with $2a$ prefix

## Problem
Previous attempt used $2b$ bcrypt hash prefix. GoTrue's Go bcrypt library
may require $2a$ prefix for password verification.

## What this migration does
Updates encrypted_password for all 12 auth users with a $2a$ bcrypt hash.
Password: ABBE2026!
*/

UPDATE auth.users
SET encrypted_password = '$2a$10$VcSAkxp3YmVVM/qjsTIFVe0tzkoOrQevlH1seyVkG.dJNHjyX8qHO',
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
