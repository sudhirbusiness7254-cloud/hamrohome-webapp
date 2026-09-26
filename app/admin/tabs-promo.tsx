"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatDate } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";
import { inputCls, btnPrimary } from "./tabs-catalog";

// ---------------------------------------------------------------- coupons
type Coupon = {
  id: string; code: string; description: string | null; type: string; value: number;
  minOrderAmount: number; usageLimit: number | null; perUserLimit: number;
  startsAt: string; endsAt: string | null; scope: string; firstOrderOnly: boolean;
  freeDelivery: boolean; isActive: boolean; usedCount: number;
};

export function PromotionsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sales, setSales] = useState<{ id: string; name: string; startsAt: string; endsAt: string; isActive: boolean; productCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoupon, setShowCoupon] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [cform, setCform] = useState({ code: "", description: "", type: "percent", value: "10", minOrderAmount: "1000", usageLimit: "", endsAt: "", scope: "all", firstOrderOnly: false, freeDelivery: false });
  const [sform, setSform] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [saleProducts, setSaleProducts] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([
        api<{ coupons: Coupon[] }>("/api/admin/coupons"),
        api<{ sales: typeof sales }>("/api/flash-sales?all=1"),
      ]);
      setCoupons(c.coupons);
      setSales(s.sales);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/coupons", {
        method: "POST",
        body: {
          code: cform.code, description: cform.description || null, type: cform.type, value: Number(cform.value),
          minOrderAmount: Number(cform.minOrderAmount) || 0, usageLimit: cform.usageLimit ? Number(cform.usageLimit) : null,
          endsAt: cform.endsAt ? new Date(cform.endsAt).toISOString() : null, scope: cform.scope,
          firstOrderOnly: cform.firstOrderOnly, freeDelivery: cform.freeDelivery,
        },
      });
      setShowCoupon(false);
      setCform({ code: "", description: "", type: "percent", value: "10", minOrderAmount: "1000", usageLimit: "", endsAt: "", scope: "all", firstOrderOnly: false, freeDelivery: false });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleCoupon = async (c: Coupon) => {
    try {
      await api("/api/admin/coupons", { method: "PATCH", body: { id: c.id, isActive: !c.isActive } });
      await load();
    } catch { /* ignore */ }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    try {
      await api(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      await load();
    } catch { /* ignore */ }
  };

  const createSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/flash-sales", {
        method: "POST",
        body: { name: sform.name, description: sform.description || null, startsAt: new Date(sform.startsAt).toISOString(), endsAt: new Date(sform.endsAt).toISOString() },
      });
      setShowSale(false);
      setSform({ name: "", description: "", startsAt: "", endsAt: "" });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSale = async (s: (typeof sales)[0]) => {
    try {
      await api("/api/flash-sales", { method: "PATCH", body: { id: s.id, isActive: !s.isActive } });
      await load();
    } catch { /* ignore */ }
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Delete flash sale?")) return;
    try {
      await api(`/api/flash-sales?id=${id}`, { method: "DELETE" });
      await load();
    } catch { /* ignore */ }
  };

  const addProductToSale = async (saleId: string) => {
    // format: slug,discount,limit
    const parts = saleProducts.split(",").map((s) => s.trim());
    if (parts.length < 3 || !parts[0]) { alert("Enter: product-slug, discount%, stock-limit"); return; }
    try {
      const p = await api<{ product: { id: string } }>(`/api/products/${parts[0]}`);
      await api("/api/flash-sales", { method: "POST", body: { op: "add-product", id: saleId, productId: p.product.id, discountPercent: Number(parts[1]), stockLimit: Number(parts[2]) } });
      setSaleProducts("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-black text-white mr-auto">Coupons ({coupons.length})</h2>
          <button onClick={() => setShowCoupon(!showCoupon)} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> New Coupon</button>
        </div>
        {showCoupon && (
          <form onSubmit={createCoupon} className="mb-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 grid sm:grid-cols-3 gap-3">
            <input required placeholder="CODE" value={cform.code} onChange={(e) => setCform({ ...cform, code: e.target.value.toUpperCase() })} className={`${inputCls} uppercase`} />
            <input placeholder="Description" value={cform.description} onChange={(e) => setCform({ ...cform, description: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <select value={cform.type} onChange={(e) => setCform({ ...cform, type: e.target.value })} className={inputCls}>
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed Rs.</option>
            </select>
            <input required placeholder="Value" value={cform.value} onChange={(e) => setCform({ ...cform, value: e.target.value })} inputMode="numeric" className={inputCls} />
            <input placeholder="Min order Rs." value={cform.minOrderAmount} onChange={(e) => setCform({ ...cform, minOrderAmount: e.target.value })} inputMode="numeric" className={inputCls} />
            <input placeholder="Usage limit (blank = unlimited)" value={cform.usageLimit} onChange={(e) => setCform({ ...cform, usageLimit: e.target.value })} inputMode="numeric" className={inputCls} />
            <input type="date" value={cform.endsAt} onChange={(e) => setCform({ ...cform, endsAt: e.target.value })} className={inputCls} />
            <select value={cform.scope} onChange={(e) => setCform({ ...cform, scope: e.target.value })} className={inputCls}>
              <option value="all">All products</option>
              <option value="category">Category scoped</option>
              <option value="product">Product scoped</option>
              <option value="vendor">Vendor scoped</option>
            </select>
            <div className="sm:col-span-3 flex gap-4 text-xs text-slate-300">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={cform.firstOrderOnly} onChange={(e) => setCform({ ...cform, firstOrderOnly: e.target.checked })} className="h-4 w-4 accent-amber-500" /> First order only</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={cform.freeDelivery} onChange={(e) => setCform({ ...cform, freeDelivery: e.target.checked })} className="h-4 w-4 accent-amber-500" /> Free delivery</label>
            </div>
            <button disabled={busy} className={`${btnPrimary} sm:col-span-3`}>{busy ? "Creating..." : "Create Coupon"}</button>
          </form>
        )}
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 flex flex-wrap items-center gap-3">
              <span className="h-10 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center font-black text-amber-300 text-sm">{c.code}</span>
              <div className="flex-1 min-w-[160px]">
                <p className="text-xs text-slate-300">{c.description || `${c.type === "percent" ? `${c.value}%` : `Rs. ${c.value}`} off`} • min {c.minOrderAmount} • used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""} • {c.scope}</p>
                <p className="text-[11px] text-slate-500">Expires: {c.endsAt ? formatDate(c.endsAt) : "never"}</p>
              </div>
              <button onClick={() => toggleCoupon(c)} className={`h-8 px-3 rounded-lg text-[11px] font-bold ${c.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>{c.isActive ? "ON" : "OFF"}</button>
              <button onClick={() => deleteCoupon(c.id)} className="text-[11px] font-bold text-rose-400">Delete</button>
            </div>
          ))}
          {coupons.length === 0 && <EmptyState title="No coupons" message="Create your first coupon campaign." />}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-black text-white mr-auto">Flash Sales ({sales.length})</h2>
          <button onClick={() => setShowSale(!showSale)} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> New Sale</button>
        </div>
        {showSale && (
          <form onSubmit={createSale} className="mb-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 grid sm:grid-cols-2 gap-3">
            <input required placeholder="Sale name" value={sform.name} onChange={(e) => setSform({ ...sform, name: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <input placeholder="Description" value={sform.description} onChange={(e) => setSform({ ...sform, description: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <div><label className="lbl">Starts At</label><input required type="datetime-local" value={sform.startsAt} onChange={(e) => setSform({ ...sform, startsAt: e.target.value })} className={inputCls} /></div>
            <div><label className="lbl">Ends At</label><input required type="datetime-local" value={sform.endsAt} onChange={(e) => setSform({ ...sform, endsAt: e.target.value })} className={inputCls} /></div>
            <button disabled={busy} className={`${btnPrimary} sm:col-span-2`}>{busy ? "Creating..." : "Create Sale"}</button>
          </form>
        )}
        <div className="space-y-2">
          {sales.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(s.startsAt)} → {formatDate(s.endsAt)} • {s.productCount} products</p>
                </div>
                <button onClick={() => toggleSale(s)} className={`h-8 px-3 rounded-lg text-[11px] font-bold ${s.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>{s.isActive ? "ON" : "OFF"}</button>
                <button onClick={() => deleteSale(s.id)} className="text-[11px] font-bold text-rose-400">Delete</button>
              </div>
              <div className="mt-2 flex gap-2">
                <input value={saleProducts} onChange={(e) => setSaleProducts(e.target.value)} placeholder="Add product: slug, discount%, limit (e.g. novaphone-x1-5g-256gb, 20, 10)" className={`${inputCls} !h-9 !text-xs flex-1`} />
                <button onClick={() => addProductToSale(s.id)} className="h-9 px-3 rounded-lg bg-slate-700 text-[11px] font-bold text-white">Add</button>
              </div>
            </div>
          ))}
          {sales.length === 0 && <EmptyState title="No flash sales" message="Create a time-limited sale to boost conversions." />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- settings
export function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [autoApprove, setAutoApprove] = useState(false);
  const [commission, setCommission] = useState("10");
  const [platformName, setPlatformName] = useState("Bazzaro");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ settings: Record<string, { enabled?: boolean; percent?: number; name?: string }> }>("/api/admin/settings");
        setSettings(d.settings);
        setAutoApprove(d.settings.autoApproveProducts?.enabled === true);
        setCommission(String(d.settings.defaultCommission?.percent ?? 10));
        setPlatformName(d.settings.platformName?.name ?? "Bazzaro");
      } catch { /* ignore */ }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: {
          autoApproveProducts: { enabled: autoApprove },
          defaultCommission: { percent: Number(commission) || 10 },
          platformName: { name: platformName },
        },
      });
      setMsg("Settings saved");
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setSaving(false);
    }
  };
  void settings;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Platform Settings</h2>
      <form onSubmit={save} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 space-y-4 max-w-xl">
        <div>
          <label className="lbl">Platform Name</label>
          <input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="lbl">Default Vendor Commission (%)</label>
          <input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="numeric" className={inputCls} />
          <p className="mt-1 text-[11px] text-slate-500">Applied to newly approved vendors. Existing vendors keep their rate.</p>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-slate-700 p-4">
          <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} className="h-5 w-5 accent-amber-500" />
          <span>
            <span className="block text-sm font-bold text-white">Auto-approve vendor products</span>
            <span className="block text-xs text-slate-500">When ON, new vendor products go live immediately without review.</span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Settings"}</button>
          {msg && <span className="text-xs font-bold text-emerald-400">{msg}</span>}
        </div>
      </form>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 max-w-xl">
        <h3 className="text-sm font-black text-white">Payment Providers</h3>
        <p className="mt-1 text-xs text-slate-500">eSewa, Khalti and COD are enabled. The gateway runs in sandbox mode until live merchant credentials are configured in environment variables. All verifications are server-side with HMAC signatures.</p>
        <div className="mt-3 flex gap-2">
          <span className="h-8 px-3 rounded-lg bg-[#60bb46] text-[11px] font-black text-white flex items-center">eSewa — Sandbox</span>
          <span className="h-8 px-3 rounded-lg bg-[#5c2d91] text-[11px] font-black text-white flex items-center">Khalti — Sandbox</span>
          <span className="h-8 px-3 rounded-lg bg-slate-700 text-[11px] font-black text-white flex items-center">COD — Live</span>
        </div>
      </div>
    </div>
  );
}
