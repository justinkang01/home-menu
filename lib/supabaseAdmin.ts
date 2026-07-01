import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key. Bypasses RLS entirely, so
// every route that uses this is responsible for its own authorization
// (looking up rows by admin_token/guest_id and checking menu_id ownership).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
