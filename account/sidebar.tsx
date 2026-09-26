"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  User, Package, RotateCcw, Star, MapPin, Bell, MessageSquare, Store, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

const TABS = [
  { v: "profile", label: "Profile", icon: User },
  { v: "orders", label: "My Orders", icon: Package },
  { v: "returns", label: "Returns & Refunds", icon: RotateCcw },
  { v: "reviews", label: "My Reviews", icon: Star },
  { v: "addresses", label: "Addresses", icon: MapPin },
  { v: "notifications", label: "Notifications", icon: Bell },
  { v: "support", label: "Support", icon: MessageSquare },
];

export function AccountSidebar({ userName, role }: { userName: string; role: string }) {
  const sp = useSearchParams();
  const tab = sp.get("tab") || "profile";
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const doLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="hidden md:block w-60 flex-shrink-0">
      <div className="sticky top-36 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-700/50 mb-3">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-white">
            {userName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </div>
        {TABS.map((t) => (
          <Link key={t.v} href={`/account?tab=${t.v}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${tab === t.v ? "bg-amber-500/10 text-amber-400" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
        {role === "customer" && (
          <Link href="/vendor/register" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 hover:text-white">
            <Store className="h-4 w-4" /> Become a Seller
          </Link>
        )}
        <button onClick={doLogout} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
