import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "radial-gradient(60% 40% at 50% 0%, rgba(200,164,92,.14), transparent)" }}
    >
      <p className="text-xs uppercase tracking-[0.4em] text-gold">Table service, reimagined</p>
      <h1 className="font-display text-7xl md:text-9xl mt-6">Velora</h1>
      <p className="mt-6 max-w-md text-bone/60">
        Scan the code on your table. Order, see your exact wait time, and be served without lifting a hand.
      </p>
      <Link href="/login" className="mt-12 rounded-full border border-gold px-8 py-3 text-gold transition hover:bg-gold hover:text-ink">
        Cafe and owner sign in
      </Link>
      <p className="mt-6 text-xs text-bone/40">Guests need no sign in. Just scan the QR code on your table.</p>
    </main>
  );
}
