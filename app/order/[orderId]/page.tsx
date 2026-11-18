"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T, useLang, LangSwitch } from "@/lib/i18n";

type Order = {
  status: string; wait: number; total: number; created_at: string; table: number; rated: boolean;
  items: { dish_id: string; name: string; qty: number }[];
};

function TrackContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_order", { p_id: orderId });
      if (data) setOrder(data); else setMissing(true);
    }
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [orderId]);

  async function submit() {
    const ratings = Object.entries(stars).map(([dish_id, rating]) => ({ dish_id, rating }));
    if (ratings.length === 0) return;
    await supabase.rpc("rate_order", { p_order: orderId, p_ratings: ratings });
    setSent(true);
  }

  if (missing) return <main className="min-h-screen p-6">We could not find this order.</main>;
  if (!order) return <main className="min-h-screen p-6 text-bone/60">{t.loading}</main>;

  const steps = [
    { key: "paid", label: t.received }, { key: "preparing", label: t.preparing },
    { key: "ready", label: t.ready }, { key: "served", label: t.served },
  ];
  const current = steps.findIndex((s) => s.key === order.status);
  const left = Math.max(0, order.wait - Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.table} {order.table}</p>
          <h1 className="font-display text-5xl mt-2">{order.status === "served" ? t.enjoy : `${t.est} ${left} ${t.min}`}</h1>
        </div>
        <LangSwitch lang={lang} set={setLang} />
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-3 ${i <= current ? "text-gold" : "text-bone/30"}`}>
            <span className={`h-3 w-3 rounded-full ${i <= current ? "bg-gold" : "border border-bone/30"}`} />{s.label}
          </li>
        ))}
      </ol>

      <div className="border-t border-gold/20 pt-4 space-y-1">
        {order.items?.map((it, i) => <p key={i}>{it.qty} × {it.name}</p>)}
        <p className="pt-2 text-bone/60">{t.total} ₹{order.total}</p>
      </div>

      {order.status === "served" && !order.rated && !sent && (
        <div className="rounded-2xl border border-gold/30 p-4 space-y-4">
          <p className="font-display text-3xl">{t.rateTitle}</p>
          {order.items.map((it) => (
            <div key={it.dish_id} className="flex items-center justify-between">
              <span>{it.name}</span>
              <span className="text-2xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setStars({ ...stars, [it.dish_id]: n })}
                    className={(stars[it.dish_id] ?? 0) >= n ? "text-gold" : "text-bone/25"}>★</button>
                ))}
              </span>
            </div>
          ))}
          <button onClick={submit} className="w-full rounded-full bg-gold text-ink font-medium py-3">{t.submit}</button>
        </div>
      )}
      {(order.rated || sent) && <p className="font-display text-3xl text-gold">{t.thanks}</p>}
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 text-bone/60">Loading...</main>}>
      <TrackContent />
    </Suspense>
  );
}
