"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Cafe = { id: string; name: string };
type Dish = {
  id: string; name: string; price: number; category: string | null; is_veg: boolean;
  is_available: boolean; prep_time_minutes: number; rating: number | null; image_url: string | null;
};
type Tbl = { id: string; table_number: number };

const inp = "rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-500";
const btn = "rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900";

export default function AdminPage() {
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Tbl[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", price: "", category: "", prep: "10", veg: true });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: c } = await supabase.from("cafes").select("id, name").maybeSingle();
    setCafe(c);
    if (c) {
      const [d, t] = await Promise.all([
        supabase.from("dishes").select("*").eq("cafe_id", c.id).order("created_at"),
        supabase.from("cafe_tables").select("id, table_number").eq("cafe_id", c.id).order("table_number"),
      ]);
      setDishes(d.data ?? []);
      setTables(t.data ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function addDish() {
    if (!cafe || !f.name || !f.price) { setMsg("Enter a dish name and price."); return; }
    let image_url: string | null = null;
    if (file) {
      const path = `${cafe.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const up = await supabase.storage.from("dish-images").upload(path, file);
      if (up.error) { setMsg(up.error.message); return; }
      image_url = supabase.storage.from("dish-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("dishes").insert({
      cafe_id: cafe.id, name: f.name, price: Number(f.price), category: f.category || null,
      is_veg: f.veg, prep_time_minutes: Number(f.prep) || 10, image_url,
    });
    setMsg(error ? error.message : "Dish added.");
    if (!error) { setF({ name: "", price: "", category: "", prep: "10", veg: true }); setFile(null); load(); }
  }

  async function update(id: string, patch: Partial<Dish>) {
    const { error } = await supabase.from("dishes").update(patch).eq("id", id);
    if (error) setMsg(error.message);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this dish?")) return;
    const { error } = await supabase.from("dishes").delete().eq("id", id);
    setMsg(error ? error.message : "Dish deleted.");
    load();
  }

  async function addTable() {
    if (!cafe) return;
    const n = (tables.length ? tables[tables.length - 1].table_number : 0) + 1;
    await supabase.from("cafe_tables").insert({ cafe_id: cafe.id, table_number: n });
    load();
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  if (loading) return <main className="min-h-screen bg-neutral-950 text-white p-8">Loading...</main>;
  if (!cafe) return <main className="min-h-screen bg-neutral-950 text-white p-8">No cafe linked to this account.</main>;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 space-y-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{cafe.name}</h1>
        <button onClick={logout} className={btn}>Log out</button>
      </div>
      {msg && <p className="text-teal-300 text-sm">{msg}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add a dish</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input className={inp} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="Price (₹)" type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <input className={inp} placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <input className={inp} placeholder="Prep minutes" type="number" value={f.prep} onChange={(e) => setF({ ...f, prep: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.veg} onChange={(e) => setF({ ...f, veg: e.target.checked })} /> Vegetarian</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button onClick={addDish} className="rounded-lg bg-white text-black font-medium px-4 py-2">Add dish</button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Menu ({dishes.length})</h2>
        {dishes.length === 0 && <p className="text-neutral-400">No dishes yet. Add your first one above.</p>}
        {dishes.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.image_url && <img src={d.image_url} alt={d.name} className="h-14 w-14 rounded-md object-cover" />}
            <div className="flex-1 min-w-40">
              <p className="font-medium">{d.name} <span className="text-xs text-neutral-400">{d.is_veg ? "Veg" : "Non-veg"}</span></p>
              <p className="text-sm text-neutral-400">₹{d.price} · {d.category ?? "Uncategorised"} · {d.prep_time_minutes} min</p>
            </div>
            <label className="text-sm text-neutral-400">Rating
              <input className={inp + " ml-2 w-16 py-1"} type="number" step="0.1" min="0" max="5" defaultValue={d.rating ?? ""}
                onBlur={(e) => update(d.id, { rating: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
            <button onClick={() => update(d.id, { is_available: !d.is_available })} className={btn}>
              {d.is_available ? "Mark sold out" : "Mark available"}
            </button>
            <button onClick={() => remove(d.id)} className={btn + " text-red-400"}>Delete</button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tables and QR codes ({tables.length})</h2>
          <button onClick={addTable} className={btn}>Add table</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tables.map((t) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${cafe.id}/t/${t.table_number}`;
            return (
              <div key={t.id} className="rounded-lg bg-white text-black p-4 text-center">
                <QRCodeSVG value={url} className="mx-auto h-32 w-32" />
                <p className="mt-2 font-medium">Table {t.table_number}</p>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-neutral-400">Print this section (Ctrl + P) and place one code on each table.</p>
      </section>
    </main>
  );
}
