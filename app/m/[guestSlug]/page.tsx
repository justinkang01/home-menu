"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Order, OrderStatus } from "@/lib/types";
import { clearGuestIdentity, loadGuestIdentity, saveGuestIdentity } from "@/lib/guestIdentity";

type PublicMenuItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  is_available: boolean;
  sort_order: number;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  served: "Served",
};

export default function GuestMenuPage() {
  const { guestSlug } = useParams<{ guestSlug: string }>();

  const [menuName, setMenuName] = useState("");
  const [items, setItems] = useState<PublicMenuItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadMenu() {
      const res = await fetch(`/api/menu/${guestSlug}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMenuName(data.menu.name);
      setItems(data.items);
      setLoading(false);
    }
    loadMenu();
  }, [guestSlug]);

  useEffect(() => {
    // localStorage is only available client-side, so this must read post-mount
    /* eslint-disable react-hooks/set-state-in-effect */
    const identity = loadGuestIdentity(guestSlug);
    if (identity) {
      setGuestId(identity.guestId);
      setDisplayName(identity.displayName);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [guestSlug]);

  const loadOwnOrders = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(`/api/menu/${guestSlug}/orders?guest_id=${guestId}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
  }, [guestSlug, guestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side data fetch on mount / guest change
    loadOwnOrders();
  }, [loadOwnOrders]);

  useEffect(() => {
    if (!guestId) return;

    const channel = supabaseClient
      .channel(`guest-orders-${guestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `guest_id=eq.${guestId}` },
        () => loadOwnOrders()
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [guestId, loadOwnOrders]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joining || !nameInput.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/menu/${guestSlug}/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: nameInput.trim() }),
      });
      const data = await res.json();
      saveGuestIdentity(guestSlug, { guestId: data.guestId, displayName: data.displayName });
      setGuestId(data.guestId);
      setDisplayName(data.displayName);
    } finally {
      setJoining(false);
    }
  }

  function notYou() {
    clearGuestIdentity(guestSlug);
    setGuestId(null);
    setDisplayName(null);
    setOrders([]);
  }

  function updateCartQuantity(itemId: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
      return { ...prev, [itemId]: next };
    });
  }

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart]
  );

  async function placeOrder() {
    if (placingOrder || cartCount === 0 || !guestId) return;
    setPlacingOrder(true);
    try {
      const orderItems = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));

      const res = await fetch(`/api/menu/${guestSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, items: orderItems }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders((prev) => [data.order, ...prev]);
        setCart({});
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted">Loading...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Menu not found</h1>
        <p className="text-sm text-muted">Double check the link you were given.</p>
      </main>
    );
  }

  if (!guestId || !displayName) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{menuName}</h1>
          <p className="mt-1 text-sm text-muted">What&apos;s your name?</p>
        </div>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="rounded-md border border-border bg-white px-3 py-2 text-base"
          />
          <button
            type="submit"
            disabled={joining}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {joining ? "Joining..." : "Continue"}
          </button>
        </form>
      </main>
    );
  }

  const categories = Array.from(new Set(items.map((i) => i.category || "Menu")));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10 pb-32">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{menuName}</h1>
          <p className="text-sm text-muted">Hi, {displayName}</p>
        </div>
        <button onClick={notYou} className="text-xs text-muted hover:underline">
          Not you?
        </button>
      </header>

      <section className="flex flex-col gap-6">
        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
              {category}
            </h2>
            {items
              .filter((i) => (i.category || "Menu") === category)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted">{item.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="h-9 w-9 shrink-0 rounded-full border border-border bg-white text-base active:bg-border-soft"
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-sm">{cart[item.id] ?? 0}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="h-9 w-9 shrink-0 rounded-full border border-border bg-white text-base active:bg-border-soft"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted">No items on the menu yet.</p>}
      </section>

      {orders.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Your orders</h2>
            <button onClick={loadOwnOrders} className="text-sm text-link hover:text-link-hover hover:underline">
              Refresh
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </span>
                  <span className="text-xs font-medium">{STATUS_LABEL[order.status]}</span>
                </div>
                <ul className="mt-1 text-sm text-foreground/80">
                  {order.order_items.map((oi) => (
                    <li key={oi.id}>
                      {oi.quantity}&times; {oi.item_name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white px-4 py-3">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between">
            <span className="text-sm">{cartCount} item(s) selected</span>
            <button
              onClick={placeOrder}
              disabled={placingOrder}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {placingOrder ? "Placing..." : "Place order"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
