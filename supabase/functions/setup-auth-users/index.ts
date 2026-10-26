import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Read all user profiles
    const { data: profiles, error: profileError } = await anonClient
      .from("users")
      .select("email, name, role, department_id, auth_user_id")
      .order("email");

    if (profileError || !profiles) {
      return new Response(
        JSON.stringify({ error: "Failed to read profiles", detail: profileError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ email: string; status: string; detail?: string }> = [];

    for (const profile of profiles) {
      try {
        // Try to update existing user's password via admin API
        if (profile.auth_user_id) {
          const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.auth_user_id);

          if (userData && !userError) {
            // User exists - update password
            const { error: updateError } = await adminClient.auth.admin.updateUserById(
              profile.auth_user_id,
              {
                password: "ABBE2026!",
                email_confirm: true,
                user_metadata: { name: profile.name },
              }
            );

            if (updateError) {
              results.push({ email: profile.email, status: "update_failed", detail: updateError.message });
            } else {
              results.push({ email: profile.email, status: "updated" });
            }
            continue;
          }
        }

        // User doesn't exist - create new one
        const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
          email: profile.email,
          password: "ABBE2026!",
          email_confirm: true,
          user_metadata: { name: profile.name },
        });

        if (createError || !newAuthUser) {
          results.push({ email: profile.email, status: "create_failed", detail: createError?.message });
          continue;
        }

        // Update profile with new auth_user_id
        const { error: linkError } = await adminClient
          .from("users")
          .update({ auth_user_id: newAuthUser.user.id })
          .eq("email", profile.email);

        if (linkError) {
          results.push({ email: profile.email, status: "link_failed", detail: linkError.message });
        } else {
          results.push({ email: profile.email, status: "created", detail: newAuthUser.user.id });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ email: profile.email, status: "error", detail: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
