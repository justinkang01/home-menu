"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DraftItem = { name: string; category: string };

export default function Home() {
  const router = useRouter();
  const [menuName, setMenuName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ name: "", category: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { name: "", category: "" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!menuName.trim()) {
      setError("Give your menu a name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: menuName.trim(),
          items: items.filter((item) => item.name.trim()),
        }),
      });

      if (!res.ok) {
        setError("Something went wrong creating your menu. Try again.");
        setSubmitting(false);
        return;
      }

      const { adminToken } = await res.json();
      router.push(`/admin/${adminToken}`);
    } catch {
      setError("Something went wrong creating your menu. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">home-menu</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a menu for your home cafe. Share it with guests so they can order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="menuName" className="text-sm font-medium">
            Menu name
          </label>
          <input
            id="menuName"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Saturday Morning Cafe"
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Menu items (optional, add more later)</span>
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                placeholder="Item name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
              />
              <input
                value={item.category}
                onChange={(e) => updateItem(index, "category", e.target.value)}
                placeholder="Category"
                className="w-28 rounded-md border border-gray-300 px-3 py-2 text-base"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItemRow(index)}
                  className="px-2 text-sm text-gray-400 hover:text-gray-600"
                  aria-label="Remove item"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItemRow}
            className="self-start text-sm text-blue-600 hover:underline"
          >
            + Add another item
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create menu"}
        </button>
      </form>
    </main>
  );
}
