import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Menu } from "@/lib/types";

export async function getMenuByAdminToken(adminToken: string): Promise<Menu | null> {
  const { data, error } = await supabaseAdmin
    .from("menus")
    .select("*")
    .eq("admin_token", adminToken)
    .single();

  if (error || !data) return null;
  return data;
}
