import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMenuByAdminToken } from "@/lib/adminAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ adminToken: string; itemId: string }> }
) {
  const { adminToken, itemId } = await params;
  const menu = await getMenuByAdminToken(adminToken);

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.category === "string") updates.category = body.category.trim() || null;
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.is_available === "boolean") updates.is_available = body.is_available;
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;

  const { data: item, error } = await supabaseAdmin
    .from("menu_items")
    .update(updates)
    .eq("id", itemId)
    .eq("menu_id", menu.id) // ensure the item belongs to this admin's menu
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ adminToken: string; itemId: string }> }
) {
  const { adminToken, itemId } = await params;
  const menu = await getMenuByAdminToken(adminToken);

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("menu_id", menu.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
