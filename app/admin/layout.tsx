"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Menu and tables" },
  { href: "/admin/orders", label: "Kitchen and live orders" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/stock", label: "Stock" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div>
      <nav className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-gold/20 bg-ink/90 backdrop-blur px-4 py-3">
        <span className="font-display text-2xl mr-4">Velora</span>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={`rounded-full px-4 py-1.5 text-sm ${path === t.href ? "bg-gold text-ink" : "border border-gold/30 text-bone/70"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
