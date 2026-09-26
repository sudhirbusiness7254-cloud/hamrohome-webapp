"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingCart, Tag, Store, ArrowRight, X } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { api, errMsg } from "@/lib/client";
import { formatNPR } from "@/lib/format";
import { useCartStore, useAuthStore } from "@/lib/store";
import { Skeleton, EmptyState } from "@/components/ui";

type Line = {
  cartItemId: string; productId: string; variantId: string | null; quantity: number;
  name: string; slug: string; sku: string; color: string | null; size: string | null;
  imageColor: string; imageUrl: string | null; unitPrice: number; mrp: number; flashDiscount: number | null;
  available: number; vendorId: string; shopName: string; vendorSlug: string;
};
type Summary = {
  lines: Line[]; count: number; subtotal: number; discount: number; tax: number;
  deliveryFee: number; grandTotal: number;
  coupon: { code: string; discount: number; freeDelivery: boolean } | null;
  couponError: string | null;
  zone: { id: string; name: string; fee: number; freeThreshold: number } | null;
  method: string;
};

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshCart = useCartStore((s) => s.refresh);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [district, setDistrict] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    try {
      setDistrict(localStorage.getItem("bz_district") || "Kathmandu");
      setAppliedCoupon(localStorage.getItem("bz_coupon") || "");
    } catch { /* ignore */ }
  }, []);

  const load = async (cp?: string, dist?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const c = cp ?? appliedCoupon;
      if (c) params.set("coupon", c);
      const d = dist ?? district;
      if (d) params.set("district", d);
      const s = params.toString();
      const res = await api<Summary>(`/api/cart${s ? `?${s}` : ""}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const applyCoupon = async () => {
    const c = coupon.trim().toUpperCase();
    if (!c) return;
    setAppliedCoupon(c);
    try { localStorage.setItem("bz_coupon", c); } catch { /* ignore */ }
    await load(c);
    setCoupon("");
  };
  const removeCoupon = async () => {
    setAppliedCoupon("");
    try { localStorage.removeItem("bz_coupon"); } catch { /* ignore */ }
    await load("");
  };

  const setQty = async (id: string, qty: number) => {
    setBusy(id);
    try {
      await api("/api/cart", { method: "PATCH", body: { id, qty } });
      await load();
      await refreshCart();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const removeItem = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/cart?id=${id}`, { method: "DELETE" });
      await load();
      await refreshCart();
    } finally {
      setBusy("");
    }
  };

  const grouped = new Map<string, { shop: string; slug: string; lines: Line[] }>();
  for (const l of data?.lines ?? []) {
    const g = grouped.get(l.vendorId) ?? { shop: l.shopName, slug: l.vendorSlug, lines: [] };
    g.lines.push(l);
    grouped.set(l.vendorId, g);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-amber-400" /> Shopping Cart
          {data && data.count > 0 && <span className="text-sm font-bold text-slate-400">({data.count} items)</span>}
        </h1>

        {loading ? (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3"><Skeleton className="h-28 !bg-slate-800" /><Skeleton className="h-28 !bg-slate-800" /></div>
            <Skeleton className="h-72 !bg-slate-800" />
          </div>
        ) : !data || data.lines.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={<ShoppingCart className="h-12 w-12" />} title="Your cart is empty"
              message="Looks like you have not added anything yet. Let's fix that."
              action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Start Shopping</Link>} />
          </div>
        ) : (
          <div className="mt-6 grid lg:grid-cols-3 gap-6 items-start">
            {/* Items grouped by seller */}
            <div className="lg:col-span-2 space-y-5">
              {[...grouped.entries()].map(([vid, g]) => (
                <div key={vid} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/50 bg-slate-800/80">
                    <Store className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">Sold by {g.shop}</span>
                  </div>
                  <div className="divide-y divide-slate-700/40">
                    {g.lines.map((l) => (
                      <div key={l.cartItemId} className="flex gap-4 p-5">
                        <Link href={`/products/${l.slug}`} className="h-20 w-20 rounded-xl flex-shrink-0 overflow-hidden bg-slate-700">
                          {l.imageUrl ? <img src={l.imageUrl} alt={l.name} className="h-full w-full object-cover" /> : <span className="h-full w-full block" style={{ backgroundColor: l.imageColor }} />}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${l.slug}`} className="text-sm font-bold text-white hover:text-amber-400 truncate block">{l.name}</Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[l.color, l.size ? `Size ${l.size}` : null].filter(Boolean).join(" / ") || l.sku}
                            {l.flashDiscount && <span className="ml-2 font-bold text-orange-400">FLASH -{l.flashDiscount}%</span>}
                          </p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-base font-black text-amber-400">{formatNPR(l.unitPrice)}</span>
                            {l.mrp > l.unitPrice && <span className="text-xs text-slate-500 line-through">{formatNPR(l.mrp)}</span>}
                          </div>
                          {l.quantity > l.available && <p className="text-xs font-bold text-rose-400">Only {l.available} available</p>}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden">
                              <button disabled={busy === l.cartItemId} onClick={() => setQty(l.cartItemId, l.quantity - 1)} className="h-8 w-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-8 text-center text-xs font-black text-white">{l.quantity}</span>
                              <button disabled={busy === l.cartItemId} onClick={() => setQty(l.cartItemId, l.quantity + 1)} className="h-8 w-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <button disabled={busy === l.cartItemId} onClick={() => removeItem(l.cartItemId)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-white">{formatNPR(l.unitPrice * l.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 lg:sticky lg:top-36">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Order Summary</h3>

              {/* Coupon */}
              <div className="mt-4">
                {data.coupon ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-bold text-emerald-300"><Tag className="h-3.5 w-3.5" /> {data.coupon.code} applied</span>
                    <button onClick={removeCoupon}><X className="h-4 w-4 text-emerald-300" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code (try SAVE10)"
                      className="flex-1 h-10 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none uppercase" />
                    <button onClick={applyCoupon} className="h-10 px-4 rounded-xl bg-slate-700 text-xs font-bold text-white hover:bg-amber-500 transition-all">Apply</button>
                  </div>
                )}
                {data.couponError && <p className="mt-1.5 text-xs font-bold text-rose-400">{data.couponError}</p>}
                {!user && <p className="mt-1.5 text-xs text-slate-500">Sign in to use coupons.</p>}
              </div>

              {/* District estimate */}
              <div className="mt-3">
                <label className="text-xs font-bold text-slate-400">Delivery district (estimate)</label>
                <select value={district} onChange={(e) => { setDistrict(e.target.value); try { localStorage.setItem("bz_district", e.target.value); } catch { /* ignore */ } load(undefined, e.target.value); }}
                  className="mt-1 w-full h-10 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white focus:border-amber-500 outline-none">
                  {["Kathmandu", "Lalitpur", "Bhaktapur", "Kaski", "Dhanusha", "Morang", "Chitwan", "Rupandehi", "Kavrepalanchok", "Other"].map((d) => <option key={d}>{d}</option>)}
                </select>
                {data.zone && <p className="mt-1 text-xs text-slate-500">Zone: {data.zone.name} — {data.zone.freeThreshold > 0 ? `free over ${formatNPR(data.zone.freeThreshold)}` : `fee ${formatNPR(data.zone.fee)}`}</p>}
              </div>

              <div className="mt-4 space-y-2 text-sm border-t border-slate-700/50 pt-4">
                <Row label={`Subtotal (${data.count} items)`} value={formatNPR(data.subtotal)} />
                {data.discount > 0 && <Row label="Coupon discount" value={`-${formatNPR(data.discount)}`} accent="text-emerald-400" />}
                {data.tax > 0 && <Row label="Tax" value={formatNPR(data.tax)} />}
                <Row label="Delivery fee" value={data.deliveryFee === 0 ? "FREE" : formatNPR(data.deliveryFee)} accent={data.deliveryFee === 0 ? "text-emerald-400" : undefined} />
                <div className="flex justify-between pt-2 border-t border-slate-700/50">
                  <span className="font-black text-white">Total</span>
                  <span className="text-xl font-black text-amber-400">{formatNPR(data.grandTotal)}</span>
                </div>
              </div>

              <button onClick={() => router.push(user ? "/checkout" : "/login?next=/checkout")}
                className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </button>
              {!user && <p className="mt-2 text-center text-xs text-slate-500">You will be asked to sign in.</p>}
              <Link href="/products" className="mt-3 block text-center text-xs font-bold text-slate-400 hover:text-white">Continue Shopping</Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold text-white ${accent ?? ""}`}>{value}</span>
    </div>
  );
}
