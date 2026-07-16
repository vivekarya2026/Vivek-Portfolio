import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY. Bypasses RLS.
 * Used for the migration script and privileged admin tasks that must not depend
 * on a user session. Never import this into client components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
