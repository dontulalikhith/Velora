'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/admin')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold text-center">Velora</h1>
        <p className="text-center text-neutral-400">Cafe admin login</p>
        <input
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none focus:border-neutral-500"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none focus:border-neutral-500"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-white text-black font-medium py-3 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </main>
  )
}
