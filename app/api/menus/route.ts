import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateAdminToken, generateGuestSlug } from "@/lib/ids";

type CreateMenuBody = {
  name: string;
  items?: { name: string; category?: string }[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateMenuBody;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Menu name is required" }, { status: 400 });
  }

  const adminToken = generateAdminToken();
  const guestSlug = generateGuestSlug();

  const { data: menu, error: menuError } = await supabaseAdmin
    .from("menus")
    .insert({ name, admin_token: adminToken, guest_slug: guestSlug })
    .select()
    .single();

  if (menuError || !menu) {
    return NextResponse.json({ error: "Failed to create menu" }, { status: 500 });
  }

  const items = (body.items ?? [])
    .map((item) => ({ name: item.name?.trim(), category: item.category?.trim() || null }))
    .filter((item) => item.name);

  if (items.length > 0) {
    const { error: itemsError } = await supabaseAdmin.from("menu_items").insert(
      items.map((item, index) => ({
        menu_id: menu.id,
        name: item.name,
        category: item.category,
        sort_order: index,
      }))
    );

    if (itemsError) {
      return NextResponse.json({ error: "Failed to create menu items" }, { status: 500 });
    }
  }

  return NextResponse.json({ adminToken: menu.admin_token, guestSlug: menu.guest_slug });
}
