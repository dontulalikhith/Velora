"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Dish = {
  id: string; name: string; price: number; category: string | null; is_veg: boolean;
  is_available: boolean; prep_time_minutes: number; rating: number | null; image_url: string | null;
};

function MenuContent() {
  const router = useRouter();
  const { cafeId, table } = useParams<{ cafeId: string; table: string }>();
  const [cafeName, setCafeName] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [vegOnly, setVegOnly] = useState(false);
  const [wait, setWait] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const [c, d] = await Promise.all([
        supabase.from("cafes").select("name").eq("id", cafeId).maybeSingle(),
        supabase.from("dishes").select("*").eq("cafe_id", cafeId).order("category"),
      ]);
      if (c.error || d.error || !c.data) { setError("This table link is not valid. Ask the staff for help."); return; }
      setCafeName(c.data.name);
      setDishes(d.data ?? []);
    }
    load();
  }, [cafeId]);

  const items = Object.entries(cart).map(([dish_id, quantity]) => ({ dish_id, quantity }));
  const cartKey = JSON.stringify(items);

  useEffect(() => {
    const list = JSON.parse(cartKey);
    if (list.length === 0) return;
    supabase.rpc("estimate_wait", { p_cafe: cafeId, p_items: list }).then(({ data }) => setWait(data));
  }, [cartKey, cafeId]);

  const change = (id: string, delta: number) =>
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });

  async function confirmOrder() {
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", { p_cafe: cafeId, p_table: Number(table), p_items: items });
    setBusy(false);
    if (error) { setNote(error.message); return; }
    router.push(`/order/${data}`);
  }

  async function callStaff(kind: "waiter" | "bill") {
    const { error } = await supabase.rpc("request_service", { p_cafe: cafeId, p_table: Number(table), p_kind: kind });
    setNote(error ? error.message : kind === "waiter" ? "A waiter is on the way." : "The bill is on the way.");
  }

  const shown = dishes.filter((d) => !vegOnly || d.is_veg);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = dishes.reduce((sum, d) => sum + (cart[d.id] ?? 0) * Number(d.price), 0);

  if (error) return <main className="min-h-screen bg-neutral-950 text-white p-6">{error}</main>;

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-32 max-w-xl mx-auto">
      <header className="p-5 border-b border-neutral-800 sticky top-0 bg-neutral-950 z-10">
        <h1 className="text-xl font-semibold">{cafeName || "Loading..."}</h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-neutral-400">Table {table}</p>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} /> Veg only
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => callStaff("waiter")} className="rounded-lg border border-neutral-700 px-3 py-1 text-sm">Call waiter</button>
          <button onClick={() => callStaff("bill")} className="rounded-lg border border-neutral-700 px-3 py-1 text-sm">Request bill</button>
        </div>
        {note && <p className="text-teal-300 text-sm mt-2">{note}</p>}
      </header>

      <div className="p-4 space-y-3">
        {shown.length === 0 && cafeName && <p className="text-neutral-400">No dishes to show.</p>}
        {shown.map((d) => (
          <div key={d.id} className={`flex gap-3 rounded-xl border border-neutral-800 p-3 ${d.is_available ? "" : "opacity-50"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.image_url && <img src={d.image_url} alt={d.name} className="h-20 w-20 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="font-medium">{d.name}</p>
              <p className="text-sm text-neutral-400">
                {d.is_veg ? "Veg" : "Non-veg"}{d.rating ? ` · ${d.rating} rating` : ""} · about {d.prep_time_minutes} min
              </p>
              <div className="flex items-center justify-between mt-2">
                <span>₹{d.price}</span>
                {!d.is_available ? (
                  <span className="text-sm text-red-400">Sold out</span>
                ) : cart[d.id] ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => change(d.id, -1)} className="h-8 w-8 rounded-full border border-neutral-600">-</button>
                    <span>{cart[d.id]}</span>
                    <button onClick={() => change(d.id, 1)} className="h-8 w-8 rounded-full border border-neutral-600">+</button>
                  </div>
                ) : (
                  <button onClick={() => change(d.id, 1)} className="rounded-lg bg-teal-300 text-black font-medium px-4 py-1">Add</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-neutral-900 border-t border-neutral-800 p-4 max-w-xl mx-auto">
          <p className="text-sm text-neutral-300 mb-2">
            {count} item{count > 1 ? "s" : ""} · ₹{total} · ready in about {wait ?? "..."} min
          </p>
          <button onClick={confirmOrder} disabled={busy} className="w-full rounded-lg bg-teal-300 text-black font-medium py-3 disabled:opacity-60">
            {busy ? "Placing order..." : `Confirm order · ₹${total}`}
          </button>
        </div>
      )}
    </main>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-950 text-white p-6">Loading menu...</main>}>
      <MenuContent />
    </Suspense>
  );
}
