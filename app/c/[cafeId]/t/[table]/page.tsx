'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T, useLang, LangSwitch } from '@/lib/i18n'
import WaiterChat from '@/components/WaiterChat'
type Dish = {
  id: string
  name: string
  price: number
  category: string | null
  is_veg: boolean
  is_available: boolean
  prep_time_minutes: number
  rating: number | null
  image_url: string | null
}
type Offer = { title: string; percent: number; starts: string; ends: string }

function MenuContent() {
  const router = useRouter()
  const { cafeId, table } = useParams<{ cafeId: string; table: string }>()
  const [lang, setLang] = useLang()
  const t = T[lang]
  const [cafeName, setCafeName] = useState('')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [sugg, setSugg] = useState<Dish[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [vegOnly, setVegOnly] = useState(false)
  const [wait, setWait] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [c, d, o] = await Promise.all([
        supabase.from('cafes').select('name').eq('id', cafeId).maybeSingle(),
        supabase
          .from('dishes')
          .select('*')
          .eq('cafe_id', cafeId)
          .order('category'),
        supabase
          .from('offers')
          .select('title, percent, starts, ends')
          .eq('cafe_id', cafeId),
      ])
      if (c.error || d.error || !c.data) {
        setError('This table link is not valid. Ask the staff for help.')
        return
      }
      setCafeName(c.data.name)
      setDishes(d.data ?? [])
      setOffers(o.data ?? [])
    }
    load()
  }, [cafeId])

  const items = Object.entries(cart).map(([dish_id, quantity]) => ({
    dish_id,
    quantity,
  }))
  const cartKey = JSON.stringify(items)

  useEffect(() => {
    const list = JSON.parse(cartKey)
    if (list.length === 0) return
    supabase
      .rpc('estimate_wait', { p_cafe: cafeId, p_items: list })
      .then(({ data }) => setWait(data))
    supabase
      .rpc('suggest_dishes', {
        p_cafe: cafeId,
        p_ids: list.map((i: { dish_id: string }) => i.dish_id),
      })
      .then(({ data }) => setSugg(data ?? []))
  }, [cartKey, cafeId])

  const change = (id: string, delta: number) =>
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }
      if (next[id] === 0) delete next[id]
      return next
    })

  async function confirmOrder() {
    setBusy(true)
    const { data, error } = await supabase.rpc('place_order', {
      p_cafe: cafeId,
      p_table: Number(table),
      p_items: items,
    })
    setBusy(false)
    if (error) {
      setNote(error.message)
      return
    }
    router.push(`/order/${data}`)
  }

  async function callStaff(kind: 'waiter' | 'bill') {
    const { error } = await supabase.rpc('request_service', {
      p_cafe: cafeId,
      p_table: Number(table),
      p_kind: kind,
    })
    setNote(error ? error.message : '✓')
  }

  const now = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
    .slice(0, 5)
  const live = offers.filter(
    (o) => o.starts.slice(0, 5) <= now && now <= o.ends.slice(0, 5),
  )
  const pct = live.reduce((m, o) => Math.max(m, o.percent), 0)

  const shown = dishes.filter((d) => !vegOnly || d.is_veg)
  const groups = shown.reduce<Record<string, Dish[]>>((a, d) => {
    ;(a[d.category ?? 'Menu'] ||= []).push(d)
    return a
  }, {})
  const count = Object.values(cart).reduce((a, b) => a + b, 0)
  const subtotal = dishes.reduce(
    (sum, d) => sum + (cart[d.id] ?? 0) * Number(d.price),
    0,
  )
  const total = Math.round(subtotal * (100 - pct)) / 100

  const DishCard = ({ d }: { d: Dish }) => (
    <div
      className={`flex gap-4 rounded-2xl border border-gold/15 bg-white/[0.03] p-3 ${d.is_available ? '' : 'opacity-50'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {d.image_url && (
        <img
          src={d.image_url}
          alt={d.name}
          className="h-24 w-24 rounded-xl object-cover"
        />
      )}
      <div className="flex-1 flex flex-col">
        <p className="font-display text-2xl leading-tight">{d.name}</p>
        <p className="text-xs text-bone/50 mt-1">
          {d.is_veg ? '● Veg' : '● Non-veg'}
          {d.rating ? ` · ★ ${d.rating}` : ''} · ~{d.prep_time_minutes} {t.min}
        </p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-gold">₹{d.price}</span>
          {!d.is_available ? (
            <span className="text-xs text-red-400">{t.soldOut}</span>
          ) : cart[d.id] ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => change(d.id, -1)}
                className="h-8 w-8 rounded-full border border-gold/40"
              >
                -
              </button>
              <span>{cart[d.id]}</span>
              <button
                onClick={() => change(d.id, 1)}
                className="h-8 w-8 rounded-full border border-gold/40"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => change(d.id, 1)}
              className="rounded-full bg-gold text-ink text-sm font-medium px-5 py-1.5"
            >
              {t.add}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (error) return <main className="min-h-screen p-6">{error}</main>

  return (
    <main className="min-h-screen pb-40 max-w-xl mx-auto">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-gold/15 px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-none">
              {cafeName || t.loading}
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-gold mt-2">
              {t.table} {table}
            </p>
          </div>
          <LangSwitch lang={lang} set={setLang} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => callStaff('waiter')}
            className="rounded-full border border-gold/30 px-3 py-1 text-xs"
          >
            {t.callWaiter}
          </button>
          <button
            onClick={() => callStaff('bill')}
            className="rounded-full border border-gold/30 px-3 py-1 text-xs"
          >
            {t.bill}
          </button>
          <label className="ml-auto text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />{' '}
            {t.vegOnly}
          </label>
        </div>
        {note && <p className="text-gold text-xs">{note}</p>}
      </header>

      {pct > 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          {live.find((o) => o.percent === pct)?.title} · {pct}% {t.off}
        </div>
      )}

      <div className="p-4 space-y-8">
        {Object.entries(groups).map(([cat, list]) => (
          <section key={cat} className="space-y-3">
            <h2 className="font-display text-3xl text-gold">{cat}</h2>
            {list.map((d) => (
              <DishCard key={d.id} d={d} />
            ))}
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 max-w-xl mx-auto bg-ink/95 backdrop-blur border-t border-gold/20 p-4 space-y-3">
          {sugg.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gold mb-2">
                {t.pairs}
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {sugg.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => change(s.id, 1)}
                    className="shrink-0 rounded-full border border-gold/30 px-4 py-1.5 text-sm"
                  >
                    + {s.name} · ₹{s.price}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-bone/70">
            {count} {t.items} ·{' '}
            {pct > 0 && <s className="text-bone/40">₹{subtotal}</s>} ₹{total} ·{' '}
            {t.readyIn} {wait ?? '...'} {t.min}
          </p>
          <button
            onClick={confirmOrder}
            disabled={busy}
            className="w-full rounded-full bg-gold text-ink font-medium py-3 disabled:opacity-60"
          >
            {busy ? t.placing : `${t.confirm} · ₹${total}`}
          </button>
        </div>
      )}
      <WaiterChat dishes={dishes} onAdd={(id) => change(id, 1)} />
    </main>
  )
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 text-bone/60">Loading...</main>
      }
    >
      <MenuContent />
    </Suspense>
  )
}
