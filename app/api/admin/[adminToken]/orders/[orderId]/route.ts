import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMenuByAdminToken } from "@/lib/adminAuth";

const VALID_STATUSES = ["pending", "preparing", "served"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ adminToken: string; orderId: string }> }
) {
  const { adminToken, orderId } = await params;
  const menu = await getMenuByAdminToken(adminToken);

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  const body = await request.json();
  const status = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("menu_id", menu.id) // ensure the order belongs to this admin's menu
    .select("*, order_items(*)")
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
