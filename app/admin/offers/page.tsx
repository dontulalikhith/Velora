"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = { id: string; title: string; percent: number; starts: string; ends: string; active: boolean };
const inp = "rounded-lg bg-white/5 border border-gold/20 px-3 py-2 outline-none focus:border-gold";

export default function OffersPage() {
  const router = useRouter();
  const [cafeId, setCafeId] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ title: "Happy hour", percent: "20", starts: "15:00", ends: "18:00" });

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: c } = await supabase.from("cafes").select("id").maybeSingle();
    if (!c) return;
    setCafeId(c.id);
    const { data } = await supabase.from("offers").select("*").eq("cafe_id", c.id).order("created_at");
    setOffers(data ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    const { error } = await supabase.from("offers").insert({
      cafe_id: cafeId, title: f.title, percent: Number(f.percent), starts: f.starts, ends: f.ends,
    });
    setMsg(error ? error.message : "Offer added.");
    load();
  }
  async function toggle(o: Offer) { await supabase.from("offers").update({ active: !o.active }).eq("id", o.id); load(); }
  async function remove(id: string) { await supabase.from("offers").delete().eq("id", id); load(); }

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="font-display text-4xl">Offers and happy hours</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inp} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className={inp} type="number" placeholder="% off" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} />
        <input className={inp} type="time" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} />
        <input className={inp} type="time" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} />
      </div>
      <button onClick={add} className="rounded-full bg-gold text-ink font-medium px-6 py-2">Add offer</button>
      {msg && <p className="text-gold text-sm">{msg}</p>}
      <p className="text-xs text-bone/50">Times are India time. The discount applies to the whole order while the offer is live.</p>
      <div className="space-y-2">
        {offers.length === 0 && <p className="text-bone/50">No offers yet.</p>}
        {offers.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/20 p-3">
            <p className="flex-1">{o.title} · {o.percent}% off · {o.starts.slice(0, 5)} to {o.ends.slice(0, 5)}</p>
            <button onClick={() => toggle(o)} className="rounded-full border border-gold/40 px-4 py-1 text-sm">{o.active ? "Pause" : "Resume"}</button>
            <button onClick={() => remove(o.id)} className="rounded-full border border-gold/40 px-4 py-1 text-sm text-red-400">Delete</button>
          </div>
        ))}
      </div>
    </main>
  );
}
