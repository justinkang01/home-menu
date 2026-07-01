import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guestSlug: string }> }
) {
  const { guestSlug } = await params;

  const { data: menu, error: menuError } = await supabaseAdmin
    .from("menus")
    .select("id, name, guest_slug")
    .eq("guest_slug", guestSlug)
    .single();

  if (menuError || !menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from("menu_items")
    .select("id, name, category, description, is_available, sort_order")
    .eq("menu_id", menu.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ menu, items: items ?? [] });
}
