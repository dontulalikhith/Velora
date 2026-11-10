"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */
const next: Record<string, { to: string; label: string }> = {
  paid: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
};

export default function LiveOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sound, setSound] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const soundOn = useRef(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const [o, r] = await Promise.all([
      supabase.from("orders")
        .select("id, status, total, estimated_wait_minutes, created_at, cafe_tables(table_number), order_items(quantity, dishes(name))")
        .in("status", ["paid", "preparing", "ready"]).order("created_at"),
      supabase.from("service_requests").select("id, kind, cafe_tables(table_number)").eq("resolved", false).order("created_at"),
    ]);
    setOrders(o.data ?? []);
    setRequests(r.data ?? []);
  }, [router]);

  function beep() {
    if (!soundOn.current || !ctx.current) return;
    const osc = ctx.current.createOscillator();
    osc.connect(ctx.current.destination);
    osc.frequency.value = 880;
    osc.start();
    osc.stop(ctx.current.currentTime + 0.3);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => { if (p.eventType === "INSERT") beep(); load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, (p) => { if (p.eventType === "INSERT") beep(); load(); })
      .subscribe();
    const t = setInterval(load, 15000);
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, [load]);

  function enableSound() {
    ctx.current = new AudioContext();
    soundOn.current = true;
    setSound(true);
    beep();
  }

  async function advance(id: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", id);
    load();
  }
  async function resolve(id: string) {
    await supabase.from("service_requests").update({ resolved: true }).eq("id", id);
    load();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Live orders</h1>
        <div className="flex gap-2">
          {!sound && <button onClick={enableSound} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">Turn on sound</button>}
          <a href="/admin" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">Menu and tables</a>
        </div>
      </div>

      {requests.length > 0 && (
        <section className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-amber-400 p-3">
              <p>Table {r.cafe_tables?.table_number}: {r.kind === "bill" ? "wants the bill" : "needs a waiter"}</p>
              <button onClick={() => resolve(r.id)} className="rounded-lg border border-neutral-600 px-3 py-1 text-sm">Done</button>
            </div>
          ))}
        </section>
      )}

      {orders.length === 0 && <p className="text-neutral-400">No active orders. New orders appear here by themselves.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-neutral-800 p-4 space-y-2">
            <div className="flex justify-between">
              <p className="text-lg font-medium">Table {o.cafe_tables?.table_number}</p>
              <p className="text-sm text-neutral-400">{o.status}</p>
            </div>
            {o.order_items?.map((it: any, i: number) => <p key={i}>{it.quantity} × {it.dishes?.name}</p>)}
            <p className="text-sm text-neutral-400">₹{o.total} · promised {o.estimated_wait_minutes} min</p>
            {next[o.status] && (
              <button onClick={() => advance(o.id, next[o.status].to)} className="w-full rounded-lg bg-teal-300 text-black font-medium py-2">
                {next[o.status].label}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
