"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Row = { id: string; name: string; stock: number | null; low_stock_at: number };

export default function StockPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data } = await supabase.from("dishes").select("id, name, stock, low_stock_at").order("name");
    setRows(data ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function save(id: string, value: string) {
    await supabase.from("dishes").update({ stock: value === "" ? null : Number(value), ...(value !== "" && Number(value) > 0 ? { is_available: true } : {}) }).eq("id", id);
    load();
  }

  const low = rows.filter((r) => r.stock !== null && r.stock <= r.low_stock_at);

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-4xl">Stock</h1>
      <p className="text-sm text-bone/60">
        Enter how many portions you have. Every order lowers it, and a dish at zero is marked sold out by itself. Leave it empty for no limit.
      </p>
      {low.length > 0 && (
        <div className="rounded-2xl border border-amber-400 p-4 text-amber-300">
          Running low: {low.map((r) => `${r.name} (${r.stock})`).join(", ")}
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-gold/20 p-3">
            <span>{r.name}</span>
            <input type="number" min="0" defaultValue={r.stock ?? ""} placeholder="no limit"
              onBlur={(e) => save(r.id, e.target.value)}
              className="w-28 rounded-lg bg-white/5 border border-gold/20 px-3 py-1 outline-none focus:border-gold" />
          </div>
        ))}
      </div>
    </main>
  );
}
