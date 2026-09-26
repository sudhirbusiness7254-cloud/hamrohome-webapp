"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, RotateCcw, Star, Wallet, Settings,
} from "lucide-react";

const TABS = [
  { v: "overview", label: "Overview", icon: LayoutDashboard },
  { v: "products", label: "Products", icon: Package },
  { v: "orders", label: "Orders", icon: ShoppingCart },
  { v: "returns", label: "Returns", icon: RotateCcw },
  { v: "reviews", label: "Reviews", icon: Star },
  { v: "wallet", label: "Wallet & Payouts", icon: Wallet },
  { v: "settings", label: "Store Settings", icon: Settings },
];

export function VendorSidebar({ userName }: { userName: string }) {
  const sp = useSearchParams();
  const tab = sp.get("tab") || "overview";
  return (
    <aside className="hidden md:block w-60 flex-shrink-0">
      <div className="sticky top-36 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
        <div className="px-2 py-3 border-b border-slate-700/50 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Seller Central</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{userName}</p>
        </div>
        {TABS.map((t) => (
          <Link key={t.v} href={`/vendor?tab=${t.v}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${tab === t.v ? "bg-amber-500/10 text-amber-400" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-white">
          Back to Storefront
        </Link>
      </div>
    </aside>
  );
}
