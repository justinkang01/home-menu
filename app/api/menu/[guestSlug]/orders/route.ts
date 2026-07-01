import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getMenuAndVerifiedGuest(guestSlug: string, guestId: string) {
  const { data: menu } = await supabaseAdmin
    .from("menus")
    .select("id")
    .eq("guest_slug", guestSlug)
    .single();

  if (!menu) return { menu: null, guest: null };

  const { data: guest } = await supabaseAdmin
    .from("guests")
    .select("id, menu_id, display_name")
    .eq("id", guestId)
    .eq("menu_id", menu.id) // prevents replaying a guest_id from a different menu
    .single();

  return { menu, guest };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guestSlug: string }> }
) {
  const { guestSlug } = await params;
  const body = await request.json();
  const guestId = body.guest_id;
  const requestedItems = (body.items ?? []) as { menu_item_id: string; quantity: number }[];

  if (!guestId || requestedItems.length === 0) {
    return NextResponse.json({ error: "Missing guest or items" }, { status: 400 });
  }

  const { menu, guest } = await getMenuAndVerifiedGuest(guestSlug, guestId);

  if (!menu || !guest) {
    return NextResponse.json({ error: "Guest not found for this menu" }, { status: 404 });
  }

  const itemIds = requestedItems.map((i) => i.menu_item_id);
  const { data: menuItems } = await supabaseAdmin
    .from("menu_items")
    .select("id, name")
    .eq("menu_id", menu.id)
    .in("id", itemIds);

  const menuItemById = new Map((menuItems ?? []).map((mi) => [mi.id, mi]));
  const validItems = requestedItems.filter((i) => menuItemById.has(i.menu_item_id));

  if (validItems.length === 0) {
    return NextResponse.json({ error: "No valid items in order" }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({ menu_id: menu.id, guest_id: guest.id, guest_name: guest.display_name })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(
      validItems.map((i) => ({
        order_id: order.id,
        menu_id: menu.id,
        menu_item_id: i.menu_item_id,
        item_name: menuItemById.get(i.menu_item_id)!.name,
        quantity: Math.max(1, Math.floor(i.quantity) || 1),
      }))
    )
    .select();

  if (itemsError) {
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }

  return NextResponse.json({ order: { ...order, order_items: orderItems ?? [] } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestSlug: string }> }
) {
  const { guestSlug } = await params;
  const guestId = new URL(request.url).searchParams.get("guest_id");

  if (!guestId) {
    return NextResponse.json({ error: "Missing guest_id" }, { status: 400 });
  }

  const { guest } = await getMenuAndVerifiedGuest(guestSlug, guestId);

  if (!guest) {
    return NextResponse.json({ error: "Guest not found for this menu" }, { status: 404 });
  }

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("guest_id", guest.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ orders: orders ?? [] });
}
