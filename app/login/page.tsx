"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const field = "w-full rounded-full bg-white/5 border border-gold/20 px-5 py-3 outline-none focus:border-gold placeholder:text-bone/30";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setError(error.message); return; }
    const { data: owner } = await supabase.rpc("is_owner");
    router.push(owner ? "/owner" : "/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "radial-gradient(60% 40% at 50% 0%, rgba(200,164,92,.14), transparent)" }}>
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="font-display text-6xl">Velora</h1>
        <p className="text-xs uppercase tracking-[0.3em] text-gold pb-4">Cafe and owner sign in</p>
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleLogin} disabled={loading}
          className="w-full rounded-full bg-gold text-ink font-medium py-3 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </main>
  );
}
