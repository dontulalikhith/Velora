'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Cafe = { id: string; name: string }

export default function AdminPage() {
  const router = useRouter()
  const [cafe, setCafe] = useState<Cafe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      const { data } = await supabase
        .from('cafes')
        .select('id, name')
        .maybeSingle()
      setCafe(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        Loading...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {cafe ? cafe.name : 'No cafe linked to this account'}
        </h1>
        <button
          onClick={logout}
          className="rounded-lg border border-neutral-700 px-4 py-2"
        >
          Log out
        </button>
      </div>
      <p className="mt-4 text-neutral-400">Dish management comes tomorrow.</p>
    </main>
  )
}
