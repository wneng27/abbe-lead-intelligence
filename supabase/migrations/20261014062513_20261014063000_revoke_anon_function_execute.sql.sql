/*
# Revoke anon access to SECURITY DEFINER functions

## Summary
The security advisor flagged that fn_user_has_data_access() and
grant_sales_leader_access() are callable by the anon role. Both functions
are SECURITY DEFINER and must only be callable by authenticated users.
This migration explicitly revokes EXECUTE from anon and re-grants to
authenticated only.

## Security Impact
- anon role can no longer call either function via the REST API.
- authenticated role retains EXECUTE on both functions.
- No data changes, no schema changes.
*/

REVOKE EXECUTE ON FUNCTION fn_user_has_data_access() FROM anon;
REVOKE EXECUTE ON FUNCTION grant_sales_leader_access(text) FROM anon;

GRANT EXECUTE ON FUNCTION fn_user_has_data_access() TO authenticated;
GRANT EXECUTE ON FUNCTION grant_sales_leader_access(text) TO authenticated;