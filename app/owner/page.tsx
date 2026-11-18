"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Row = { id: string; name: string; orders: number; revenue: number; orders_24h: number; commission_if_2pct: number };
const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

export default function OwnerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: ok } = await supabase.rpc("is_owner");
      if (!ok) { router.replace("/admin"); return; }
      const { data } = await supabase.rpc("owner_stats");
      setRows(data ?? []);
    }
    load();
  }, [router]);

  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  if (!rows) return <main className="min-h-screen p-8 text-bone/60">Loading...</main>;

  const sum = (k: keyof Row) => rows.reduce((a, r) => a + Number(r[k]), 0);
  const cards = [
    { label: "Cafes", value: rows.length },
    { label: "Orders", value: sum("orders") },
    { label: "Orders, last 24h", value: sum("orders_24h") },
    { label: "Revenue through Velora", value: inr(sum("revenue")) },
  ];

  return (
    <main className="min-h-screen p-4 md:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Owner dashboard</h1>
        <button onClick={logout} className="rounded-full border border-gold/40 px-4 py-2 text-sm">Log out</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gold/20 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-widest text-gold">{c.label}</p>
            <p className="font-display text-4xl mt-2">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="text-gold text-xs uppercase tracking-widest">
            <tr><th className="p-4">Cafe</th><th className="p-4">Orders</th><th className="p-4">Last 24h</th><th className="p-4">Revenue</th><th className="p-4">2% if switched on</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gold/10">
                <td className="p-4">{r.name}</td><td className="p-4">{r.orders}</td><td className="p-4">{r.orders_24h}</td>
                <td className="p-4">{inr(r.revenue)}</td><td className="p-4 text-bone/50">{inr(r.commission_if_2pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-bone/40">Commission is switched off. The last column only shows what 2% would be.</p>
    </main>
  );
}
