"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Store, Users, RotateCcw, Wallet,
  Ticket, Truck, MessageSquare, LayoutTemplate, Settings, ScrollText,
} from "lucide-react";

const ALL_TABS = [
  { v: "dashboard", label: "Dashboard", icon: LayoutDashboard, area: "dashboard" },
  { v: "orders", label: "Orders", icon: ShoppingCart, area: "orders" },
  { v: "products", label: "Products & Approvals", icon: Package, area: "products" },
  { v: "catalog", label: "Categories & Brands", icon: LayoutTemplate, area: "catalog" },
  { v: "vendors", label: "Vendors", icon: Store, area: "vendors" },
  { v: "customers", label: "Customers", icon: Users, area: "customers" },
  { v: "returns", label: "Returns & Refunds", icon: RotateCcw, area: "returns" },
  { v: "withdrawals", label: "Withdrawals", icon: Wallet, area: "withdrawals" },
  { v: "promos", label: "Promotions", icon: Ticket, area: "promos" },
  { v: "delivery", label: "Delivery Zones", icon: Truck, area: "delivery" },
  { v: "support", label: "Support", icon: MessageSquare, area: "support" },
  { v: "cms", label: "Homepage CMS", icon: LayoutTemplate, area: "cms" },
  { v: "settings", label: "Settings", icon: Settings, area: "settings" },
  { v: "audit", label: "Audit Logs", icon: ScrollText, area: "audit" },
];

export function AdminSidebar({ userName, tier, allowed }: { userName: string; tier: string; allowed: string[] }) {
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dashboard";
  const tabs = ALL_TABS.filter((t) => allowed.includes(t.area));
  return (
    <aside className="hidden md:block w-60 flex-shrink-0">
      <div className="sticky top-36 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <div className="px-2 py-3 border-b border-slate-700/50 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin Panel</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{userName}</p>
          <p className="text-[11px] text-amber-400 font-bold capitalize">{tier.replace(/_/g, " ")}</p>
        </div>
        {tabs.map((t) => (
          <Link key={t.v} href={`/admin?tab=${t.v}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${tab === t.v ? "bg-amber-500/10 text-amber-400" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function adminMobileTabs(allowed: string[]) {
  return ALL_TABS.filter((t) => allowed.includes(t.area));
}
