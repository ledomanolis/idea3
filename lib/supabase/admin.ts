import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses row-level security. Server-only: never import this from a
// "use client" file. Used to read group members' calendar links, which
// RLS keeps private to each person.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
