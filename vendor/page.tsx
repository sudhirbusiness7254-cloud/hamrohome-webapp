"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp, ShoppingCart, Package, Clock, Wallet, AlertTriangle, Plus, Store,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate, ORDER_STATUS_META } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";
import { ProductsTab, inputCls, btnPrimary } from "./tabs-products";
import { OrdersTab, ReturnsTab, ReviewsTab } from "./tabs-ops";

const MOBILE_TABS = [
  { v: "overview", label: "Overview" }, { v: "products", label: "Products" }, { v: "orders", label: "Orders" },
  { v: "returns", label: "Returns" }, { v: "reviews", label: "Reviews" }, { v: "wallet", label: "Wallet" }, { v: "settings", label: "Settings" },
];

type Vendor = {
  id: string; shopName: string; slug: string; description: string | null; status: string;
  commissionRate: string; businessName: string | null; panVatNumber: string | null;
  bankName: string | null; bankAccount: string | null; bankHolder: string | null;
  rejectedReason: string | null; logoColor: string;
};

function VendorInner() {
  const sp = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ vendor: Vendor | null }>("/api/vendor/status");
        setVendor(d.vendor);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-32 !bg-slate-800" /><Skeleton className="h-32 !bg-slate-800" /></div>;
  }
  if (!vendor) {
    return (
      <EmptyState icon={<Store className="h-12 w-12" />} title="No shop found"
        message="Register your shop to access the vendor dashboard."
        action={<Link href="/vendor/register" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Register Shop</Link>} />
    );
  }

  const approved = vendor.status === "approved";

  return (
    <div>
      <div className="md:hidden scroll-row flex gap-2 overflow-x-auto pb-3 mb-2">
        {MOBILE_TABS.map((t) => (
          <Link key={t.v} href={`/vendor?tab=${t.v}`}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.v ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {vendor.status === "pending" && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" /> Your shop <b>{vendor.shopName}</b> is under review. You will be notified once approved.
        </div>
      )}
      {vendor.status === "rejected" && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Your application was rejected: {vendor.rejectedReason || "No reason given"}. Please contact support.
        </div>
      )}

      {tab === "overview" && <OverviewTab vendor={vendor} />}
      {tab === "products" && <ProductsTab approved={approved} />}
      {tab === "orders" && <OrdersTab />}
      {tab === "returns" && <ReturnsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "wallet" && <WalletTab />}
      {tab === "settings" && <SettingsTab vendor={vendor} onSaved={setVendor} />}
    </div>
  );
}

export default function VendorPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading...</div>}>
      <VendorInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------- overview
type Dash = {
  vendor: Vendor;
  stats: { revenue: number; orders: number; products: number; pendingOrders: number; balance: number; pending: number };
  lowStock: { id: string; name: string; slug: string; stock: number; reservedStock: number }[];
  recentOrders: { id: string; orderNumber: string; status: string; grandTotal: number; createdAt: string; share: number }[];
  recentTxns: { id: string; type: string; amount: number; note: string | null; createdAt: string }[];
  daily: { day: string; n: number }[];
};

function OverviewTab({ vendor }: { vendor: Vendor }) {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<Dash>("/api/vendor/dashboard");
        setData(d);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!data) return <div className="space-y-3"><Skeleton className="h-28 !bg-slate-800" /><Skeleton className="h-48 !bg-slate-800" /></div>;
  const s = data.stats;
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.n));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">{vendor.shopName} — Overview</h2>
        <Link href={`/store/${vendor.slug}`} target="_blank" className="text-xs font-bold text-amber-400 hover:underline">View Public Store</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Total Revenue" value={formatNPR(s.revenue)} />
        <Stat icon={<ShoppingCart className="h-5 w-5 text-amber-400" />} label="Orders" value={String(s.orders)} sub={`${s.pendingOrders} need action`} />
        <Stat icon={<Package className="h-5 w-5 text-sky-400" />} label="Products" value={String(s.products)} />
        <Stat icon={<Wallet className="h-5 w-5 text-violet-400" />} label="Wallet Balance" value={formatNPR(s.balance)} sub={`${formatNPR(s.pending)} pending`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-4">Sales — Last 14 Days</h3>
          {data.daily.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet in this period.</p>
          ) : (
            <div className="flex items-end gap-1.5 h-36">
              {data.daily.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: Rs. ${d.n.toLocaleString()}`}>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-amber-500/40 to-amber-400" style={{ height: `${Math.max(4, (d.n / maxDaily) * 120)}px` }} />
                  <span className="text-[8px] text-slate-600">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Low Stock</h3>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">All products are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {data.lowStock.map((p) => (
                <div key={p.id} className="flex justify-between text-sm rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2">
                  <span className="text-slate-200 font-semibold truncate">{p.name}</span>
                  <span className="font-black text-amber-400">{p.stock - p.reservedStock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-white">Recent Orders</h3>
          <Link href="/vendor?tab=orders" className="text-xs font-bold text-amber-400 hover:underline">View all</Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2.5">
                <div>
                  <p className="font-bold text-white">{o.orderNumber}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-amber-400">{formatNPR(o.share)}</p>
                  <span className="text-[10px] font-bold" style={{ color: ORDER_STATUS_META[o.status]?.color }}>{ORDER_STATUS_META[o.status]?.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
      <div className="flex items-center gap-2">{icon}<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>
      <p className="mt-1.5 text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- wallet
type WalletData = {
  balance: number; pending: number; commissionRate: number;
  txns: { id: string; type: string; amount: number; balanceAfter: number; note: string | null; createdAt: string }[];
  withdrawals: { id: string; amount: number; status: string; createdAt: string; note: string | null }[];
};

function WalletTab() {
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await api<WalletData>("/api/vendor/wallet");
      setData(d);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/vendor/withdrawals", { method: "POST", body: { amount: Number(amount) } });
      setAmount("");
      await load();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="space-y-3"><Skeleton className="h-28 !bg-slate-800" /></div>;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Wallet & Payouts</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Available Balance</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">{formatNPR(data.balance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pending (undelivered)</p>
          <p className="mt-1 text-2xl font-black text-white">{formatNPR(data.pending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Commission Rate</p>
          <p className="mt-1 text-2xl font-black text-white">{data.commissionRate}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <h3 className="text-sm font-black text-white">Request Withdrawal</h3>
        <p className="text-xs text-slate-500 mt-0.5">Minimum Rs. 100. Paid to your registered bank account after admin approval.</p>
        <form onSubmit={request} className="mt-3 flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount in Rs." inputMode="numeric" className={`${inputCls} max-w-xs`} />
          <button disabled={busy || !amount} className={btnPrimary}>{busy ? "Requesting..." : "Request"}</button>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3">Transactions</h3>
          {data.txns.length === 0 ? <p className="text-sm text-slate-500">No transactions yet.</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {data.txns.map((t) => (
                <div key={t.id} className="flex justify-between text-xs rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2">
                  <div>
                    <p className="font-bold text-slate-200 capitalize">{t.type} <span className="text-slate-500 font-normal">• bal {formatNPR(t.balanceAfter)}</span></p>
                    <p className="text-slate-500">{t.note || formatDate(t.createdAt)}</p>
                  </div>
                  <p className={`font-black ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.amount >= 0 ? "+" : ""}{formatNPR(t.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
          <h3 className="text-sm font-black text-white mb-3">Withdrawal History</h3>
          {data.withdrawals.length === 0 ? <p className="text-sm text-slate-500">No withdrawals yet.</p> : (
            <div className="space-y-2">
              {data.withdrawals.map((w) => (
                <div key={w.id} className="flex justify-between text-xs rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2">
                  <div>
                    <p className="font-bold text-slate-200 capitalize">{w.status}</p>
                    <p className="text-slate-500">{formatDate(w.createdAt)}{w.note ? ` • ${w.note}` : ""}</p>
                  </div>
                  <p className="font-black text-white">{formatNPR(w.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- settings
function SettingsTab({ vendor, onSaved }: { vendor: Vendor; onSaved: (v: Vendor) => void }) {
  const [form, setForm] = useState({
    shopName: vendor.shopName, description: vendor.description || "", logoColor: vendor.logoColor,
    businessName: vendor.businessName || "", panVatNumber: vendor.panVatNumber || "",
    bankName: vendor.bankName || "", bankAccount: vendor.bankAccount || "", bankHolder: vendor.bankHolder || "",
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const d = await api<{ vendor: Vendor }>("/api/vendor/settings", { method: "PATCH", body: form });
      onSaved(d.vendor);
      setMsg("Settings saved");
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Store Settings</h2>
      <form onSubmit={save} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 grid sm:grid-cols-2 gap-4">
        <div><label className="lbl">Shop Name</label><input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">Logo Color</label><input type="color" value={form.logoColor} onChange={(e) => setForm({ ...form, logoColor: e.target.value })} className="h-11 w-full rounded-xl bg-slate-900 border border-slate-700 cursor-pointer" /></div>
        <div className="sm:col-span-2"><label className="lbl">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputCls} !h-auto py-3`} /></div>
        <div><label className="lbl">Business Name</label><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">PAN / VAT</label><input value={form.panVatNumber} onChange={(e) => setForm({ ...form, panVatNumber: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">Bank Name</label><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">Account Holder</label><input value={form.bankHolder} onChange={(e) => setForm({ ...form, bankHolder: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">Account Number</label><input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} className={inputCls} /></div>
        <div><label className="lbl">Commission</label><input value={`${vendor.commissionRate}%`} disabled className={`${inputCls} opacity-60`} /></div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Settings"}</button>
          {msg && <span className="text-xs font-bold text-emerald-400">{msg}</span>}
          <Link href={`/store/${vendor.slug}`} target="_blank" className="text-xs font-bold text-amber-400 hover:underline ml-auto flex items-center gap-1"><Plus className="h-3 w-3" /> View Store</Link>
        </div>
      </form>
    </div>
  );
}
