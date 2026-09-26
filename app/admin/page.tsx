"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp, ShoppingCart, Users, Store, Package, Wallet, RotateCcw, Banknote,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/lib/store";
import { OrdersTab, ReturnsTab, WithdrawalsTab, SupportTab, AuditTab } from "./tabs-ops";
import { ProductsTab, VendorsTab, DeliveryTab, CmsTab, CatalogTab } from "./tabs-catalog";
import { PromotionsTab, SettingsTab } from "./tabs-promo";
import { adminMobileTabs } from "./sidebar";
import { canAdminAccessTier } from "@/lib/permissions";

function AdminInner() {
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dashboard";
  const user = useAuthStore((s) => s.user);
  const authLoaded = useAuthStore((s) => s.loaded);
  const allTabs = ["dashboard", "orders", "products", "catalog", "vendors", "customers", "returns", "withdrawals", "promos", "delivery", "support", "cms", "settings", "audit"];
  const areaName: Record<string, string> = { dashboard: "analytics", returns: "refunds", promos: "coupons", cms: "sections" };
  const allowed = user?.role === "admin" ? allTabs.filter((area) => canAdminAccessTier(user.adminTier, areaName[area] ?? area)) : [];
  const TABS = adminMobileTabs(allowed);

  if (!authLoaded) return <Skeleton className="h-44 !bg-slate-800" />;
  if (!allowed.includes(tab)) return <EmptyState title="Permission required" message="Your admin role does not have access to this section." />;

  return (
    <div>
      <div className="md:hidden scroll-row flex gap-2 overflow-x-auto pb-3 mb-2">
        {TABS.map((t) => (
          <Link key={t.v} href={`/admin?tab=${t.v}`}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.v ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "vendors" && <VendorsTab />}
      {tab === "customers" && <CustomersTab />}
      {tab === "returns" && <ReturnsTab />}
      {tab === "withdrawals" && <WithdrawalsTab />}
      {tab === "promos" && <PromotionsTab />}
      {tab === "delivery" && <DeliveryTab />}
      {tab === "support" && <SupportTab />}
      {tab === "cms" && <CmsTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading...</div>}>
      <AdminInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------- dashboard
type Dash = {
  metrics: {
    totalSales: number; todaySales: number; monthSales: number; totalOrders: number; pendingOrders: number;
    customers: number; vendors: number; vendorsPending: number; products: number; productsPending: number;
    commission: number; refunds: number; withdrawalsPending: number;
  };
  daily: { day: string; sales: number; orders: number }[];
  topProducts: { name: string; slug: string; soldCount: number }[];
  topVendors: { shop: string; n: number }[];
  topCats: { name: string; n: number }[];
  lowStock: { id: string; name: string; slug: string; stock: number; reservedStock: number }[];
};

function DashboardTab() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<Dash>("/api/admin/dashboard");
        setData(d);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!data) return <div className="space-y-3"><Skeleton className="h-28 !bg-slate-800" /><Skeleton className="h-48 !bg-slate-800" /></div>;
  const m = data.metrics;
  const maxSales = Math.max(1, ...data.daily.map((d) => d.sales));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Total Sales" value={formatNPR(m.totalSales)} sub={`Today ${formatNPR(m.todaySales)}`} />
        <Stat icon={<Banknote className="h-5 w-5 text-amber-400" />} label="Month Sales" value={formatNPR(m.monthSales)} sub={`${m.totalOrders} orders total`} />
        <Stat icon={<ShoppingCart className="h-5 w-5 text-sky-400" />} label="Pending Orders" value={String(m.pendingOrders)} link="/admin?tab=orders" />
        <Stat icon={<Wallet className="h-5 w-5 text-violet-400" />} label="Commission Earned" value={formatNPR(m.commission)} />
        <Stat icon={<Users className="h-5 w-5 text-blue-400" />} label="Customers" value={String(m.customers)} link="/admin?tab=customers" />
        <Stat icon={<Store className="h-5 w-5 text-orange-400" />} label="Vendors" value={String(m.vendors)} sub={`${m.vendorsPending} pending approval`} link="/admin?tab=vendors" />
        <Stat icon={<Package className="h-5 w-5 text-teal-400" />} label="Products" value={String(m.products)} sub={`${m.productsPending} pending approval`} link="/admin?tab=products" />
        <Stat icon={<RotateCcw className="h-5 w-5 text-rose-400" />} label="Refunds / Withdrawals" value={`${m.refunds} / ${m.withdrawalsPending}`} link="/admin?tab=returns" />
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <h3 className="text-sm font-black text-white mb-4">Revenue — Last 14 Days</h3>
        {data.daily.length === 0 ? <p className="text-sm text-slate-500">No delivered sales in this period.</p> : (
          <div className="flex items-end gap-1.5 h-40">
            {data.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${formatNPR(d.sales)} (${d.orders} orders)`}>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-amber-500/40 to-amber-400" style={{ height: `${Math.max(4, (d.sales / maxSales) * 130)}px` }} />
                <span className="text-[8px] text-slate-600">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3">Top Products</h3>
          {data.topProducts.map((p, i) => (
            <div key={i} className="flex justify-between text-xs py-1.5 border-b border-slate-700/30 last:border-0">
              <Link href={`/products/${p.slug}`} className="text-slate-200 font-semibold truncate hover:text-amber-400">{p.name}</Link>
              <span className="text-slate-400 ml-2">{p.soldCount} sold</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3">Top Vendors</h3>
          {data.topVendors.map((v, i) => (
            <div key={i} className="flex justify-between text-xs py-1.5 border-b border-slate-700/30 last:border-0">
              <span className="text-slate-200 font-semibold">{v.shop}</span>
              <span className="text-slate-400">{formatNPR(v.n)}</span>
            </div>
          ))}
          {data.topVendors.length === 0 && <p className="text-xs text-slate-500">No vendor sales yet.</p>}
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3">Low Stock Alerts</h3>
          {data.lowStock.length === 0 ? <p className="text-xs text-slate-500">All good.</p> : data.lowStock.slice(0, 6).map((p) => (
            <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-slate-700/30 last:border-0">
              <Link href={`/products/${p.slug}`} className="text-slate-200 font-semibold truncate hover:text-amber-400">{p.name}</Link>
              <span className="text-amber-400 font-bold ml-2">{p.stock - p.reservedStock} left</span>
            </div>
          ))}
        </div>
      </div>

      {(m.vendorsPending > 0 || m.productsPending > 0 || m.withdrawalsPending > 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="text-sm font-black text-white">Needs Your Attention</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {m.vendorsPending > 0 && <Link href="/admin?tab=vendors" className="text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-slate-200 hover:border-amber-500">{m.vendorsPending} vendor(s) pending</Link>}
            {m.productsPending > 0 && <Link href="/admin?tab=products" className="text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-slate-200 hover:border-amber-500">{m.productsPending} product(s) pending</Link>}
            {m.withdrawalsPending > 0 && <Link href="/admin?tab=withdrawals" className="text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-slate-200 hover:border-amber-500">{m.withdrawalsPending} withdrawal(s) pending</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub, link }: { icon: React.ReactNode; label: string; value: string; sub?: string; link?: string }) {
  const inner = (
    <>
      <div className="flex items-center gap-2">{icon}<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>
      <p className="mt-1.5 text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </>
  );
  const cls = "rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 block";
  return link ? <Link href={link} className={`${cls} hover:border-amber-500/40 transition-all`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

// ---------------------------------------------------------------- customers
type AUser = { id: string; name: string; email: string; phone: string | null; role: string; adminTier: string | null; createdAt: string };

function CustomersTab() {
  const [rows, setRows] = useState<AUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  const load = async (r = role, qq = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (r) params.set("role", r);
      if (qq) params.set("q", qq);
      const d = await api<{ users: AUser[] }>("/api/admin/users?" + params.toString());
      setRows(d.users);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const setTier = async (id: string, adminTier: string) => {
    setBusy(id);
    try {
      await api("/api/admin/users", { method: "PATCH", body: { id, adminTier } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black text-white mr-auto">Users</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(role, query)} placeholder="Search name/email..."
          className="h-10 w-48 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
        <select value={role} onChange={(e) => { setRole(e.target.value); load(e.target.value, query); }} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      {loading ? <Skeleton className="h-40 !bg-slate-800" /> : rows.length === 0 ? <EmptyState title="No users" message="Nothing found." /> : (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                <th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Admin Tier</th><th className="px-4 py-3">Joined</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/40">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3"><p className="font-bold text-white">{u.name}</p><p className="text-[11px] text-slate-500">{u.email} {u.phone ? `• ${u.phone}` : ""}</p></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-700 text-slate-200 capitalize">{u.role}</span></td>
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <select disabled={busy === u.id} value={u.adminTier || "super_admin"} onChange={(e) => setTier(u.id, e.target.value)} className="h-9 rounded-lg bg-slate-900 border border-slate-700 px-2 text-xs text-white">
                          {["super_admin", "product_admin", "order_admin", "finance_admin", "vendor_manager", "support_agent"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                        </select>
                      ) : <span className="text-xs text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
