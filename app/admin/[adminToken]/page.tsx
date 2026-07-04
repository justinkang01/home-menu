"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Menu, MenuItem, Order, OrderStatus } from "@/lib/types";

type Snapshot = {
  menu: Menu;
  items: MenuItem[];
  orders: Order[];
};

const STATUS_FLOW: OrderStatus[] = ["pending", "preparing", "served"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  served: "Served",
};

export default function AdminPage() {
  const { adminToken } = useParams<{ adminToken: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const guestUrl = useMemo(() => {
    if (!snapshot || typeof window === "undefined") return "";
    return `${window.location.origin}/m/${snapshot.menu.guest_slug}`;
  }, [snapshot]);

  const loadSnapshot = useCallback(async () => {
    const res = await fetch(`/api/admin/${adminToken}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setSnapshot(data);
  }, [adminToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side data fetch on mount
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const menuId = snapshot?.menu.id;
    if (!menuId) return;

    const channel = supabaseClient
      .channel(`admin-orders-${menuId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `menu_id=eq.${menuId}` },
        () => loadSnapshot()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `menu_id=eq.${menuId}` },
        () => loadSnapshot()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_items", filter: `menu_id=eq.${menuId}` },
        () => loadSnapshot()
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [snapshot?.menu.id, loadSnapshot]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (addingItem || !newItemName.trim()) return;
    setAddingItem(true);
    try {
      await fetch(`/api/admin/${adminToken}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim(), category: newItemCategory.trim() }),
      });
      setNewItemName("");
      setNewItemCategory("");
      await loadSnapshot();
    } finally {
      setAddingItem(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/admin/${adminToken}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: !item.is_available }),
    });
    await loadSnapshot();
  }

  async function deleteItem(item: MenuItem) {
    await fetch(`/api/admin/${adminToken}/items/${item.id}`, { method: "DELETE" });
    await loadSnapshot();
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category ?? "");
  }

  function cancelEditItem() {
    setEditingItemId(null);
  }

  async function saveEditItem(item: MenuItem) {
    if (savingEdit || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await fetch(`/api/admin/${adminToken}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), category: editCategory.trim() }),
      });
      setEditingItemId(null);
      await loadSnapshot();
    } finally {
      setSavingEdit(false);
    }
  }

  async function setOrderStatus(order: Order, status: OrderStatus) {
    if (updatingOrderId) return;
    setUpdatingOrderId(order.id);
    try {
      await fetch(`/api/admin/${adminToken}/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadSnapshot();
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function copyGuestLink() {
    await navigator.clipboard.writeText(guestUrl);
  }

  if (notFound) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Menu not found</h1>
        <p className="text-sm text-muted">Double check the admin link you were given.</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted">Loading...</p>
      </main>
    );
  }

  const activeOrders = snapshot.orders.filter((o) => o.status !== "served");
  const servedOrders = snapshot.orders.filter((o) => o.status === "served");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{snapshot.menu.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Guest link:</span>
            <code className="rounded bg-border-soft px-2 py-1">{guestUrl}</code>
            <button onClick={copyGuestLink} className="text-link hover:text-link-hover hover:underline">
              Copy
            </button>
          </div>
        </div>
        {guestUrl && (
          <div className="flex flex-col items-center gap-1 self-center sm:self-auto">
            <QRCodeSVG value={guestUrl} size={112} />
            <span className="text-xs text-muted">Scan to order</span>
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Orders</h2>
          <button onClick={loadSnapshot} className="text-sm text-link hover:text-link-hover hover:underline">
            Refresh
          </button>
        </div>

        {activeOrders.length === 0 && servedOrders.length === 0 && (
          <p className="text-sm text-muted">No orders yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSetStatus={setOrderStatus}
              isUpdating={updatingOrderId === order.id}
            />
          ))}
        </div>

        {servedOrders.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted">
              Served orders ({servedOrders.length})
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              {servedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onSetStatus={setOrderStatus}
                  isUpdating={updatingOrderId === order.id}
                />
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Menu items</h2>

        <div className="flex flex-col gap-2">
          {snapshot.items.length === 0 && (
            <p className="text-sm text-muted">No items yet. Add your first one below.</p>
          )}
          {snapshot.items.map((item) =>
            editingItemId === item.id ? (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditItem(item)}
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1 text-base"
                />
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditItem(item)}
                  placeholder="Category"
                  className="w-24 shrink-0 rounded-md border border-border bg-white px-2 py-1 text-base"
                />
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    onClick={() => saveEditItem(item)}
                    disabled={savingEdit}
                    className="text-link hover:text-link-hover hover:underline disabled:opacity-60"
                  >
                    {savingEdit ? "Saving..." : "Save"}
                  </button>
                  <button onClick={cancelEditItem} className="text-muted hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${!item.is_available ? "text-muted line-through" : ""}`}>
                    {item.name}
                  </p>
                  {item.category && <p className="text-xs text-muted">{item.category}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button onClick={() => startEditItem(item)} className="text-link hover:text-link-hover hover:underline">
                    Edit
                  </button>
                  <button onClick={() => toggleAvailability(item)} className="text-link hover:text-link-hover hover:underline">
                    {item.is_available ? "Mark 86'd" : "Mark available"}
                  </button>
                  <button onClick={() => deleteItem(item)} className="text-danger hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name"
            className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-base"
          />
          <input
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            placeholder="Category"
            className="w-28 rounded-md border border-border bg-white px-3 py-2 text-base"
          />
          <button
            type="submit"
            disabled={addingItem}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>
    </main>
  );
}

function OrderCard({
  order,
  onSetStatus,
  isUpdating,
}: {
  order: Order;
  onSetStatus: (order: Order, status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{order.guest_name}</p>
        <span className="text-xs text-muted">{STATUS_LABEL[order.status]}</span>
      </div>
      <ul className="mt-1 text-sm text-foreground/80">
        {order.order_items.map((oi) => (
          <li key={oi.id}>
            {oi.quantity}&times; {oi.item_name}
          </li>
        ))}
      </ul>
      {nextStatus && (
        <button
          onClick={() => onSetStatus(order, nextStatus)}
          disabled={isUpdating}
          className="mt-2 rounded-md bg-secondary px-3 py-1 text-xs font-medium text-accent-foreground transition-transform hover:bg-secondary-hover active:scale-95 active:bg-secondary-hover disabled:opacity-60"
        >
          {isUpdating ? "Updating..." : `Mark ${STATUS_LABEL[nextStatus]}`}
        </button>
      )}
    </div>
  );
}
