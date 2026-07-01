"use client";

import { createClient } from "@supabase/supabase-js";

// Browser singleton using the anon key. Used only for read-only Realtime
// subscriptions (orders/guests/order_items) — never for writes or for
// anything touching admin_token.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
