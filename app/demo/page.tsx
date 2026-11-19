"use client";

import { useEffect, useState } from "react";

const MENU = [
  { id: "1", name: "Cappuccino", price: 140, prep: 5, veg: true, cat: "Drinks" },
  { id: "2", name: "Cold Coffee", price: 160, prep: 5, veg: true, cat: "Drinks" },
  { id: "3", name: "Truffle Fries", price: 220, prep: 10, veg: true, cat: "Plates" },
  { id: "4", name: "Paneer Tikka Sandwich", price: 240, prep: 12, veg: true, cat: "Plates" },
  { id: "5", name: "Smoked Chicken Wrap", price: 280, prep: 14, veg: false, cat: "Plates" },
  { id: "6", name: "Tiramisu", price: 260, prep: 4, veg: true, cat: "Desserts" },
];
const STEPS = ["Order received", "Being prepared", "Ready to serve", "Served"];

export default function Demo() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<number | null>(null);
  const items = MENU.filter((d) => cart[d.id]);
  const count = items.reduce((a, d) => a + cart[d.id], 0);
  const total = items.reduce((a, d) => a + cart[d.id] * d.price, 0);
  const wait = items.length ? Math.max(...items.map((d) => d.prep)) + 4 : 0;
  const bump = (id: string, n: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + n) }));

  useEffect(() => {
    if (step === null || step >= 3) return;
    const t = setTimeout(() => setStep(step + 1), 3500);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <main className="min-h-screen max-w-xl mx-auto p-5 pb-40">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Demo mode · nothing here is real</p>
      <h1 className="font-display text-5xl mt-2">Velora Lounge</h1>
      <p className="text-bone/50 text-sm">Table 4</p>

      {step === null ? (
        <div className="mt-8 space-y-3">
          {MENU.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-2xl border border-gold/15 bg-white/[0.03] p-4">
              <div>
                <p className="font-display text-2xl">{d.name}</p>
                <p className="text-xs text-bone/50">{d.cat} · {d.veg ? "Veg" : "Non-veg"} · ~{d.prep} min</p>
                <p className="text-gold mt-1">₹{d.price}</p>
              </div>
              {cart[d.id] ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => bump(d.id, -1)} className="h-8 w-8 rounded-full border border-gold/40">-</button>
                  <span>{cart[d.id]}</span>
                  <button onClick={() => bump(d.id, 1)} className="h-8 w-8 rounded-full border border-gold/40">+</button>
                </div>
              ) : (
                <button onClick={() => bump(d.id, 1)} className="rounded-full bg-gold text-ink text-sm font-medium px-5 py-1.5">Add</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          <h2 className="font-display text-4xl">{step === 3 ? "Enjoy your order." : `Ready in about ${Math.max(1, wait - step * 4)} min`}</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 ${i <= step ? "text-gold" : "text-bone/30"}`}>
                <span className={`h-3 w-3 rounded-full ${i <= step ? "bg-gold" : "border border-bone/30"}`} />{s}
              </li>
            ))}
          </ol>
          <button onClick={() => { setStep(null); setCart({}); }} className="rounded-full border border-gold/40 px-5 py-2 text-sm">Start again</button>
        </div>
      )}

      {step === null && count > 0 && (
        <div className="fixed bottom-0 inset-x-0 max-w-xl mx-auto bg-ink/95 border-t border-gold/20 p-4 space-y-2">
          <p className="text-sm text-bone/70">{count} items · ₹{total} · ready in about {wait} min</p>
          <button onClick={() => setStep(0)} className="w-full rounded-full bg-gold text-ink font-medium py-3">Confirm order · ₹{total}</button>
        </div>
      )}
    </main>
  );
}
