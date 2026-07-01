export type OrderStatus = "pending" | "preparing" | "served";

export type Menu = {
  id: string;
  admin_token: string;
  guest_slug: string;
  name: string;
  created_at: string;
};

export type MenuItem = {
  id: string;
  menu_id: string;
  category: string | null;
  name: string;
  description: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
};

export type Guest = {
  id: string;
  menu_id: string;
  display_name: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  created_at: string;
};

export type Order = {
  id: string;
  menu_id: string;
  guest_id: string;
  guest_name: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
};
