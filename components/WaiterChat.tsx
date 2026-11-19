"use client";

import { useState } from "react";

type D = { id: string; name: string; price: number; category: string | null; is_veg: boolean; is_available: boolean; prep_time_minutes: number; rating: number | null };

function ask(q: string, dishes: D[]) {
  const s = q.toLowerCase();
  let pool = dishes.filter((d) => d.is_available);
  const tags: string[] = [];
  if (/non[- ]?veg|chicken|meat|egg|fish/.test(s)) { pool = pool.filter((d) => !d.is_veg); tags.push("non-veg"); }
  else if (/veg/.test(s)) { pool = pool.filter((d) => d.is_veg); tags.push("vegetarian"); }
  const m = s.match(/(?:under|below|less than|within|₹|rs\.?)\s*(\d{2,4})/);
  if (m) { pool = pool.filter((d) => Number(d.price) <= Number(m[1])); tags.push(`under ₹${m[1]}`); }
  if (/quick|fast|hurry|short|less time/.test(s)) { pool = pool.filter((d) => d.prep_time_minutes <= 8); tags.push("quick"); }
  if (/drink|coffee|tea|beverage|juice|shake/.test(s)) {
    const drinks = pool.filter((d) => /drink|beverage|coffee|tea|juice/i.test(d.category ?? ""));
    if (drinks.length) pool = drinks;
    tags.push("drinks");
  }
  pool = /cheap|budget|affordable/.test(s)
    ? [...pool].sort((a, b) => a.price - b.price)
    : [...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const picks = pool.slice(0, 3);
  const text = picks.length
    ? `Here is what I would suggest${tags.length ? " (" + tags.join(", ") + ")" : ""}:`
    : "I could not find a match. Try asking for something quick, vegetarian, or under a price.";
  return { text, picks };
}

export default function WaiterChat({ dishes, onAdd }: { dishes: D[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ text: string; picks: D[] } | null>(null);
  const go = (text: string) => { setQ(text); setRes(ask(text, dishes)); };

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed right-4 top-32 z-20 rounded-full bg-gold text-ink text-sm font-medium px-4 py-2 shadow-lg">
        Ask the waiter
      </button>
      {open && (
        <div className="fixed inset-x-4 top-44 z-20 mx-auto max-w-md rounded-2xl border border-gold/40 bg-ink p-4 space-y-3 shadow-2xl">
          <p className="font-display text-2xl">What are you in the mood for?</p>
          <div className="flex flex-wrap gap-2">
            {["Something quick", "Veg under 200", "Best rated", "A cold drink"].map((c) => (
              <button key={c} onClick={() => go(c)} className="rounded-full border border-gold/30 px-3 py-1 text-xs">{c}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. non veg under 250"
              className="flex-1 rounded-full bg-white/5 border border-gold/20 px-4 py-2 text-sm outline-none focus:border-gold" />
            <button onClick={() => go(q)} className="rounded-full bg-gold text-ink px-4 text-sm">Ask</button>
          </div>
          {res && (
            <div className="space-y-2">
              <p className="text-sm text-bone/70">{res.text}</p>
              {res.picks.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-gold/20 px-3 py-2 text-sm">
                  <span>{d.name} · ₹{d.price}{d.rating ? ` · ★ ${d.rating}` : ""}</span>
                  <button onClick={() => onAdd(d.id)} className="rounded-full bg-gold text-ink px-3 py-1 text-xs">Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
