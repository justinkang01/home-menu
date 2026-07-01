import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMenuByAdminToken } from "@/lib/adminAuth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const menu = await getMenuByAdminToken(adminToken);

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const [{ data: items }, { data: orders }] = await Promise.all([
    supabaseAdmin
      .from("menu_items")
      .select("*")
      .eq("menu_id", menu.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("menu_id", menu.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    menu,
    items: items ?? [],
    orders: orders ?? [],
  });
}
