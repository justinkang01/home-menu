import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guestSlug: string }> }
) {
  const { guestSlug } = await params;

  const { data: menu, error: menuError } = await supabaseAdmin
    .from("menus")
    .select("id")
    .eq("guest_slug", guestSlug)
    .single();

  if (menuError || !menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const body = await request.json();
  const displayName = body.display_name?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: guest, error } = await supabaseAdmin
    .from("guests")
    .insert({ menu_id: menu.id, display_name: displayName })
    .select()
    .single();

  if (error || !guest) {
    return NextResponse.json({ error: "Failed to register guest" }, { status: 500 });
  }

  return NextResponse.json({ guestId: guest.id, displayName: guest.display_name });
}
