import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE-ROLE key. It bypasses RLS, so
// it MUST never be imported into a client component or exposed to the browser —
// only "use server" action files may import it. Read paths use the anon client
// under public-read RLS policies; writes (logging / deleting matches) go here.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — required for match writes once RLS is on.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
