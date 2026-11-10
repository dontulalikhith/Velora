"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = { status: string; wait: number; total: number; created_at: string; table: number; items: { name: string; qty: number }[] };

const steps = [
  { key: "paid", label: "Order received" },
  { key: "preparing", label: "Being prepared" },
  { key: "ready", label: "Ready to serve" },
  { key: "served", label: "Served" },
];

function TrackContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_order", { p_id: orderId });
      if (data) setOrder(data); else setMissing(true);
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [orderId]);

  if (missing) return <main className="min-h-screen bg-neutral-950 text-white p-6">We could not find this order.</main>;
  if (!order) return <main className="min-h-screen bg-neutral-950 text-white p-6">Loading...</main>;

  const current = steps.findIndex((s) => s.key === order.status);
  const left = Math.max(0, order.wait - Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Table {order.table}</h1>
      <p className="text-neutral-300">
        {order.status === "served" ? "Enjoy your order." : `Estimated ready in about ${left} min`}
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.key} className={i <= current ? "text-teal-300" : "text-neutral-500"}>
            {i <= current ? "✓ " : "○ "}{s.label}
          </li>
        ))}
      </ol>
      <div className="border-t border-neutral-800 pt-4">
        {order.items?.map((it, i) => <p key={i}>{it.qty} × {it.name}</p>)}
        <p className="mt-2 text-neutral-400">Total ₹{order.total}</p>
      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-950 text-white p-6">Loading...</main>}>
      <TrackContent />
    </Suspense>
  );
}
