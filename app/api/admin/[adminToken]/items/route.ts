import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMenuByAdminToken } from "@/lib/adminAuth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const menu = await getMenuByAdminToken(adminToken);

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const { data: item, error } = await supabaseAdmin
    .from("menu_items")
    .insert({
      menu_id: menu.id,
      name,
      category: body.category?.trim() || null,
      description: body.description?.trim() || null,
    })
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }

  return NextResponse.json({ item });
}
