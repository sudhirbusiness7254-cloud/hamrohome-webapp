"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Plus, Star, Archive, ImageIcon } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";
import { ProductForm } from "../vendor/tabs-products";

export const inputCls = "w-full h-11 rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";
export const btnPrimary = "h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50";

const P_COLOR: Record<string, string> = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444", archived: "#64748b" };

// ---------------------------------------------------------------- products
type AProduct = {
  product: import("../vendor/tabs-products").VProduct & { isFeatured: boolean; createdAt: string };
  shopName: string | null;
  categoryName: string | null;
};

export function ProductsTab() {
  const [rows, setRows] = useState<AProduct[]>([]);
  const [categories, setCategories] = useState<import("../vendor/tabs-products").Facet[]>([]);
  const [brands, setBrands] = useState<import("../vendor/tabs-products").Facet[]>([]);
  const [sellers, setSellers] = useState<import("../vendor/tabs-products").SellerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<import("../vendor/tabs-products").VProduct | null>(null);
  const [error, setError] = useState("");

  const load = async (status = filter, term = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (term) params.set("q", term);
      const d = await api<{
        products: AProduct[];
        categories: typeof categories;
        brands: typeof brands;
        sellers: typeof sellers;
      }>(`/api/admin/products?${params.toString()}`);
      setRows(d.products);
      setCategories(d.categories);
      setBrands(d.brands);
      setSellers(d.sellers);
      setError("");
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const act = async (id: string, action: string) => {
    const reason = action === "reject" ? prompt("Reason the seller will see:") : undefined;
    if (action === "reject" && !reason) return;
    setBusy(id);
    try {
      await api("/api/admin/products", { method: "POST", body: { id, action, reason } });
      await load();
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(""); }
  };
  const openEdit = (p: AProduct) => {
    setEditing({ ...p.product, categoryName: p.categoryName, brandName: null });
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-black text-white">Products & approvals</h2>
          <p className="text-xs text-slate-500 mt-0.5">Review seller submissions or publish products for an approved store.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowEditor(true); }} className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4" /> Add product</button>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(filter, query)} placeholder="Search name / SKU..." className="h-10 w-44 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-400" />
        <select value={filter} onChange={(e) => { setFilter(e.target.value); load(e.target.value, query); }} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="pending">Awaiting approval</option><option value="approved">Live products</option><option value="rejected">Rejected</option><option value="archived">Archived</option><option value="">All products</option>
        </select>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {showEditor && <ProductForm
        mode="admin" categories={categories} brands={brands} sellers={sellers} editing={editing}
        onClose={() => { setShowEditor(false); setEditing(null); }}
        onSaved={async () => { setShowEditor(false); setEditing(null); setFilter(""); await load("", query); }}
      />}
      {loading ? <Skeleton className="h-44 !bg-slate-800" /> : rows.length === 0 ? <EmptyState title="Nothing to review" message="No products match this filter. Add one or check another status." /> : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.product.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-slate-600 transition-colors">
              <div className="flex gap-3 sm:gap-4 items-start">
                {r.product.images?.[0]?.url ? <img src={r.product.images[0].url} alt={r.product.name} className="h-20 w-20 rounded-xl object-cover bg-slate-700 flex-shrink-0" /> : <span className="h-20 w-20 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0"><ImageIcon className="h-6 w-6 text-slate-400" /></span>}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="text-sm font-bold text-white">{r.product.name} {r.product.isFeatured && <Star className="inline h-3.5 w-3.5 text-amber-400 ml-1" />}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.shopName ?? "Unknown seller"} · {r.categoryName ?? "Uncategorised"} · {r.product.sku}</p>
                      <p className="text-xs text-slate-300 mt-1">{formatNPR(r.product.salePrice ?? r.product.price)} · {r.product.stock} in stock · {r.product.images?.length ?? 0} photos</p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize" style={{ backgroundColor: `${P_COLOR[r.product.status]}22`, color: P_COLOR[r.product.status] }}>{r.product.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.product.status === "pending" && <>
                      <button disabled={busy === r.product.id || !r.product.images?.length} onClick={() => act(r.product.id, "approve")} className="h-8 px-3 rounded-lg bg-emerald-600 text-[11px] font-bold text-white disabled:opacity-40 flex items-center gap-1"><Check className="h-3 w-3" /> Approve & publish</button>
                      <button disabled={busy === r.product.id} onClick={() => act(r.product.id, "reject")} className="h-8 px-3 rounded-lg bg-rose-600 text-[11px] font-bold text-white disabled:opacity-50 flex items-center gap-1"><X className="h-3 w-3" /> Reject</button>
                    </>}
                    <button onClick={() => openEdit(r)} className="h-8 px-3 rounded-lg border border-slate-600 text-[11px] font-bold text-slate-200 hover:border-amber-400 hover:text-amber-400 transition-colors">Edit & photos</button>
                    {r.product.status === "approved" && <>
                      <button disabled={busy === r.product.id} onClick={() => act(r.product.id, r.product.isFeatured ? "unfeature" : "feature")} className="h-8 px-3 rounded-lg border border-slate-600 text-[11px] font-bold text-slate-200">{r.product.isFeatured ? "Remove feature" : "Feature"}</button>
                      <Link href={`/products/${r.product.slug}`} target="_blank" className="h-8 px-3 rounded-lg border border-slate-600 text-[11px] font-bold text-slate-200 inline-flex items-center">View live ↗</Link>
                    </>}
                    {r.product.status !== "archived" && <button disabled={busy === r.product.id} onClick={() => { if (confirm("Archive this listing?")) act(r.product.id, "archive"); }} className="h-8 px-3 rounded-lg border border-slate-600 text-[11px] font-bold text-slate-400 flex items-center gap-1"><Archive className="h-3 w-3" /> Archive</button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- vendors
type AVendor = {
  vendor: { id: string; shopName: string; slug: string; status: string; commissionRate: string; businessName: string | null; panVatNumber: string | null; bankName: string | null; bankAccount: string | null; bankHolder: string | null; rejectedReason: string | null; createdAt: string; description: string | null };
  owner: string; email: string; productCount: number; balance: number;
};

export function VendorsTab() {
  const [rows, setRows] = useState<AVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState("");

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const d = await api<{ vendors: AVendor[] }>(`/api/admin/vendors${f ? `?status=${f}` : ""}`);
      setRows(d.vendors);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    let reason: string | undefined;
    let commission: number | undefined;
    if (action === "reject") {
      reason = prompt("Rejection reason:") || "";
      if (!reason) return;
    } else {
      const c = prompt("Commission % (default 10):", "10");
      if (c === null) return;
      commission = Number(c) || 10;
    }
    setBusy(id);
    try {
      await api("/api/admin/vendors", { method: "POST", body: { id, action, reason, commission } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const color = (s: string) => ({ pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444" }[s] ?? "#64748b");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-white mr-auto">Vendors</h2>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); load(e.target.value); }} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {loading ? <Skeleton className="h-40 !bg-slate-800" /> : rows.length === 0 ? <EmptyState title="No vendors" message="Nothing here." /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.vendor.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{r.vendor.shopName} <span className="text-[11px] text-slate-500 font-normal">by {r.owner} ({r.email})</span></p>
                  <p className="text-[11px] text-slate-500">
                    {r.vendor.businessName || "No business name"} • PAN: {r.vendor.panVatNumber || "—"} • Bank: {r.vendor.bankName || "—"} {r.vendor.bankAccount || ""} • {r.productCount} products • bal {formatNPR(r.balance)} • {r.vendor.commissionRate}% commission
                  </p>
                  {r.vendor.description && <p className="mt-1 text-xs text-slate-400">{r.vendor.description}</p>}
                  {r.vendor.status === "rejected" && r.vendor.rejectedReason && <p className="text-xs text-rose-400">Rejected: {r.vendor.rejectedReason}</p>}
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize h-fit" style={{ backgroundColor: `${color(r.vendor.status)}22`, color: color(r.vendor.status) }}>{r.vendor.status}</span>
              </div>
              {r.vendor.status === "pending" && (
                <div className="mt-2.5 flex gap-2">
                  <button disabled={busy === r.vendor.id} onClick={() => act(r.vendor.id, "approve")} className="h-8 px-3 rounded-lg bg-emerald-600 text-[11px] font-bold text-white disabled:opacity-50 flex items-center gap-1"><Check className="h-3 w-3" /> Approve</button>
                  <button disabled={busy === r.vendor.id} onClick={() => act(r.vendor.id, "reject")} className="h-8 px-3 rounded-lg bg-rose-600 text-[11px] font-bold text-white disabled:opacity-50 flex items-center gap-1"><X className="h-3 w-3" /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- delivery zones
type Zone = {
  id: string; name: string; districts: string[]; fee: number; freeThreshold: number;
  estDaysMin: number; estDaysMax: number; codEnabled: boolean; expressEnabled: boolean;
  sameDayEnabled: boolean; pickupEnabled: boolean; isActive: boolean;
};

export function DeliveryTab() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", districts: "", fee: "100", freeThreshold: "2000", estDaysMin: "2", estDaysMax: "4", codEnabled: true, expressEnabled: false, sameDayEnabled: false, pickupEnabled: false });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await api<{ zones: Zone[] }>("/api/admin/delivery");
      setZones(d.zones);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/delivery", {
        method: "POST",
        body: {
          name: form.name, districts: form.districts.split(",").map((s) => s.trim()).filter(Boolean),
          fee: Number(form.fee), freeThreshold: Number(form.freeThreshold),
          estDaysMin: Number(form.estDaysMin), estDaysMax: Number(form.estDaysMax),
          codEnabled: form.codEnabled, expressEnabled: form.expressEnabled,
          sameDayEnabled: form.sameDayEnabled, pickupEnabled: form.pickupEnabled,
        },
      });
      setShow(false);
      setForm({ name: "", districts: "", fee: "100", freeThreshold: "2000", estDaysMin: "2", estDaysMax: "4", codEnabled: true, expressEnabled: false, sameDayEnabled: false, pickupEnabled: false });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (z: Zone, key: "isActive" | "codEnabled" | "expressEnabled" | "sameDayEnabled" | "pickupEnabled") => {
    try {
      await api("/api/admin/delivery", { method: "PATCH", body: { id: z.id, [key]: !z[key] } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this zone?")) return;
    try {
      await api(`/api/admin/delivery?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-white mr-auto">Delivery Zones</h2>
        <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> Add Zone</button>
      </div>
      {show && (
        <form onSubmit={create} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 grid sm:grid-cols-2 gap-3">
          <input required placeholder="Zone name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input required placeholder="Districts (comma separated)" value={form.districts} onChange={(e) => setForm({ ...form, districts: e.target.value })} className={inputCls} />
          <input placeholder="Fee Rs." value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} inputMode="numeric" className={inputCls} />
          <input placeholder="Free threshold Rs." value={form.freeThreshold} onChange={(e) => setForm({ ...form, freeThreshold: e.target.value })} inputMode="numeric" className={inputCls} />
          <input placeholder="Min days" value={form.estDaysMin} onChange={(e) => setForm({ ...form, estDaysMin: e.target.value })} inputMode="numeric" className={inputCls} />
          <input placeholder="Max days" value={form.estDaysMax} onChange={(e) => setForm({ ...form, estDaysMax: e.target.value })} inputMode="numeric" className={inputCls} />
          <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-slate-300">
            {(["codEnabled", "expressEnabled", "sameDayEnabled", "pickupEnabled"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                {k.replace("Enabled", "").replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
          <button disabled={busy} className={`${btnPrimary} sm:col-span-2`}>{busy ? "Creating..." : "Create Zone"}</button>
        </form>
      )}
      {zones.map((z) => (
        <div key={z.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{z.name} {!z.isActive && <span className="text-[10px] text-slate-500">(disabled)</span>}</p>
              <p className="text-[11px] text-slate-500">{z.districts.join(", ")}</p>
              <p className="text-xs text-slate-300 mt-1">Fee {formatNPR(z.fee)} • Free over {formatNPR(z.freeThreshold)} • {z.estDaysMin}-{z.estDaysMax} days</p>
            </div>
            <button onClick={() => remove(z.id)} className="text-xs font-bold text-rose-400 hover:underline h-fit">Delete</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["isActive", "codEnabled", "expressEnabled", "sameDayEnabled", "pickupEnabled"] as const).map((k) => (
              <button key={k} onClick={() => toggle(z, k)} className={`h-7 px-2.5 rounded-lg text-[10px] font-bold ${z[k] ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                {k.replace("Enabled", "").replace("Active", "Active").replace(/([A-Z])/g, " $1")}: {z[k] ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- photo campaign manager
export { CmsTab } from "./campaign-manager";

// ---------------------------------------------------------------- categories & brands
export function CatalogTab() {
  const [cats, setCats] = useState<{ id: string; name: string; slug: string; color: string; icon: string; isActive: boolean; parentId: string | null }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cName, setCName] = useState("");
  const [bName, setBName] = useState("");

  const load = async () => {
    try {
      const d = await api<{ categories: typeof cats; brands: typeof brands }>("/api/admin/catalog");
      setCats(d.categories);
      setBrands(d.brands);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const addCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog", { method: "POST", body: { kind: "category", name: cName } });
      setCName("");
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };
  const addBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog", { method: "POST", body: { kind: "brand", name: bName } });
      setBName("");
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };
  const del = async (kind: string, id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api(`/api/admin/catalog?id=${id}&kind=${kind}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(errMsg(e));
    }
  };
  const toggleCat = async (c: (typeof cats)[0]) => {
    try {
      await api("/api/admin/catalog", { method: "PATCH", body: { kind: "category", id: c.id, isActive: !c.isActive } });
      await load();
    } catch { /* ignore */ }
  };

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <h3 className="text-sm font-black text-white mb-3">Categories ({cats.length})</h3>
        <form onSubmit={addCat} className="flex gap-2 mb-3">
          <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="New category name" className={`${inputCls} !h-10 flex-1`} />
          <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white">Add</button>
        </form>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2">
              <span className="h-4 w-4 rounded" style={{ backgroundColor: c.color }} />
              <span className="text-xs font-bold text-white flex-1">{c.parentId ? "— " : ""}{c.name}</span>
              <button onClick={() => toggleCat(c)} className={`text-[10px] font-bold ${c.isActive ? "text-emerald-400" : "text-slate-500"}`}>{c.isActive ? "ON" : "OFF"}</button>
              <button onClick={() => del("category", c.id, c.name)} className="text-[10px] font-bold text-rose-400">Delete</button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <h3 className="text-sm font-black text-white mb-3">Brands ({brands.length})</h3>
        <form onSubmit={addBrand} className="flex gap-2 mb-3">
          <input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="New brand name" className={`${inputCls} !h-10 flex-1`} />
          <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white">Add</button>
        </form>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {brands.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2">
              <span className="h-4 w-4 rounded" style={{ backgroundColor: b.color }} />
              <span className="text-xs font-bold text-white flex-1">{b.name}</span>
              <button onClick={() => del("brand", b.id, b.name)} className="text-[10px] font-bold text-rose-400">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
