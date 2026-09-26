"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin, Truck, CreditCard, ClipboardCheck, Plus, Check, Banknote, Wallet, ChevronLeft,
} from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { api, errMsg } from "@/lib/client";
import { formatNPR } from "@/lib/format";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Skeleton, EmptyState } from "@/components/ui";

type Address = {
  id: string; label: string; recipient: string; phone: string; province: string;
  district: string; city: string; ward: string | null; street: string; landmark: string | null; isDefault: boolean;
};
type Zone = {
  id: string; name: string; districts: string[]; fee: number; freeThreshold: number;
  estDaysMin: number; estDaysMax: number; codEnabled: boolean;
  expressEnabled: boolean; sameDayEnabled: boolean; pickupEnabled: boolean;
};
type Line = { cartItemId: string; name: string; slug: string; imageColor: string; imageUrl: string | null; unitPrice: number; quantity: number; color: string | null; size: string | null; shopName: string };
type Summary = {
  lines: Line[]; count: number; subtotal: number; discount: number; tax: number;
  deliveryFee: number; grandTotal: number;
  coupon: { code: string; discount: number; freeDelivery: boolean } | null;
  couponError: string | null; zone: Zone | null; method: string;
};

const STEPS = [
  { n: 1, label: "Address", icon: MapPin },
  { n: 2, label: "Delivery", icon: Truck },
  { n: 3, label: "Payment", icon: CreditCard },
  { n: 4, label: "Review", icon: ClipboardCheck },
];

const METHODS = [
  { v: "standard", label: "Standard Delivery", desc: "Regular doorstep delivery" },
  { v: "express", label: "Express Delivery", desc: "+Rs. 80 — prioritized dispatch" },
  { v: "same_day", label: "Same-Day Delivery", desc: "+Rs. 150 — order before 2 PM" },
  { v: "pickup", label: "Store Pickup", desc: "Free — collect from hub" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loaded } = useAuthStore();
  const refreshCart = useCartStore((s) => s.refresh);
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const [addressId, setAddressId] = useState("");
  const [method, setMethod] = useState("standard");
  const [payMethod, setPayMethod] = useState<"cod" | "esewa" | "khalti">("cod");
  const [coupon, setCoupon] = useState("");
  const [note, setNote] = useState("");
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: "Home", recipient: "", phone: "", province: "Bagmati", district: "Kathmandu", city: "", ward: "", street: "", landmark: "" });
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.push("/login?next=/checkout"); return; }
    try { setCoupon(localStorage.getItem("bz_coupon") || ""); } catch { /* ignore */ }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user]);

  const load = async (aId?: string, m?: string, cp?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const aid = aId ?? addressId;
      if (aid) params.set("addressId", aid);
      params.set("method", m ?? method);
      const c = cp ?? coupon;
      if (c) params.set("coupon", c);
      const s = params.toString();
      const data = await api<{ addresses: Address[]; zones: Zone[]; summary: Summary }>(`/api/checkout${s ? `?${s}` : ""}`);
      setAddresses(data.addresses);
      setZones(data.zones);
      setSummary(data.summary);
      if (!aid && data.addresses.length > 0) {
        const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
        setAddressId(def.id);
      }
      if (data.summary.zone && !data.summary.zone.codEnabled && payMethod === "cod") {
        // keep cod selected; UI will block it
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loaded || !user) return;
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId, method, coupon]);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrSaving(true);
    try {
      const data = await api<{ address: Address }>("/api/addresses", { method: "POST", body: { ...addrForm, isDefault: addresses.length === 0 } });
      setAddresses([...addresses, data.address]);
      setAddressId(data.address.id);
      setShowAddrForm(false);
      setAddrForm({ label: "Home", recipient: "", phone: "", province: "Bagmati", district: "Kathmandu", city: "", ward: "", street: "", landmark: "" });
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setAddrSaving(false);
    }
  };

  const placeOrder = async () => {
    setError("");
    if (!addressId) { setError("Please select a delivery address"); setStep(1); return; }
    if (payMethod === "cod" && summary?.zone && !summary.zone.codEnabled) { setError("COD is not available in your zone. Choose eSewa or Khalti."); setStep(3); return; }
    setPlacing(true);
    try {
      const res = await api<{ redirectUrl: string }>("/api/checkout", {
        method: "POST",
        body: { addressId, zoneId: summary?.zone?.id ?? null, method: summary?.method ?? method, paymentMethod: payMethod, couponCode: coupon || null, note: note || null },
      });
      try { localStorage.removeItem("bz_coupon"); } catch { /* ignore */ }
      await refreshCart();
      router.push(res.redirectUrl);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setPlacing(false);
    }
  };

  const methodAvailable = (v: string) => {
    if (!summary?.zone) return v === "standard";
    if (v === "standard") return true;
    if (v === "express") return summary.zone.expressEnabled;
    if (v === "same_day") return summary.zone.sameDayEnabled;
    if (v === "pickup") return summary.zone.pickupEnabled;
    return false;
  };

  if (!loaded || !user) {
    return <div className="min-h-screen bg-slate-950"><Header /><div className="py-20 text-center text-slate-400">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-6xl px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-black text-white">Checkout</h1>

        {/* Steps */}
        <div className="mt-5 flex items-center gap-1 sm:gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <button onClick={() => s.n < step && setStep(s.n)} className="flex items-center gap-2">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= s.n ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                  {step > s.n ? <Check className="h-4 w-4" /> : s.n}
                </span>
                <span className={`text-xs sm:text-sm font-bold hidden sm:block ${step >= s.n ? "text-white" : "text-slate-500"}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 rounded ${step > s.n ? "bg-amber-500" : "bg-slate-800"}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">{error}</div>}

        {loading && !summary ? (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-64 !bg-slate-800" /></div>
            <Skeleton className="h-64 !bg-slate-800" />
          </div>
        ) : summary && summary.lines.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="Your cart is empty" message="Add some products before checking out."
              action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Browse Products</Link>} />
          </div>
        ) : summary ? (
          <div className="mt-6 grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              {/* STEP 1: Address */}
              {step === 1 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-white">Delivery Address</h3>
                    <button onClick={() => setShowAddrForm(!showAddrForm)} className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300">
                      <Plus className="h-3.5 w-3.5" /> New Address
                    </button>
                  </div>
                  {showAddrForm && (
                    <form onSubmit={saveAddress} className="mb-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 grid sm:grid-cols-2 gap-3">
                      <input required placeholder="Label (Home/Office)" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} className={inputCls} />
                      <input required placeholder="Recipient name" value={addrForm.recipient} onChange={(e) => setAddrForm({ ...addrForm, recipient: e.target.value })} className={inputCls} />
                      <input required placeholder="Phone" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} className={inputCls} />
                      <input required placeholder="Province" value={addrForm.province} onChange={(e) => setAddrForm({ ...addrForm, province: e.target.value })} className={inputCls} />
                      <input required placeholder="District" value={addrForm.district} onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })} className={inputCls} />
                      <input required placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className={inputCls} />
                      <input placeholder="Ward no." value={addrForm.ward} onChange={(e) => setAddrForm({ ...addrForm, ward: e.target.value })} className={inputCls} />
                      <input placeholder="Landmark" value={addrForm.landmark} onChange={(e) => setAddrForm({ ...addrForm, landmark: e.target.value })} className={inputCls} />
                      <input required placeholder="Street / Tole address" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                      <button disabled={addrSaving} className="sm:col-span-2 h-11 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white disabled:opacity-50">
                        {addrSaving ? "Saving..." : "Save Address"}
                      </button>
                    </form>
                  )}
                  {addresses.length === 0 && !showAddrForm ? (
                    <p className="text-sm text-slate-400">No addresses yet. Add one to continue.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {addresses.map((a) => (
                        <button key={a.id} onClick={() => setAddressId(a.id)}
                          className={`text-left rounded-xl border-2 p-4 transition-all ${addressId === a.id ? "border-amber-500 bg-amber-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-amber-400" /> {a.label}
                            {a.isDefault && <span className="text-[10px] rounded bg-slate-700 px-1.5 py-0.5 text-slate-300">DEFAULT</span>}
                          </p>
                          <p className="mt-1 text-xs text-slate-300">{a.recipient} — {a.phone}</p>
                          <p className="text-xs text-slate-500">{a.street}, {a.city}{a.ward ? `-${a.ward}` : ""}, {a.district}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex justify-end">
                    <button disabled={!addressId} onClick={() => setStep(2)} className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white disabled:opacity-40">Continue</button>
                  </div>
                </div>
              )}

              {/* STEP 2: Delivery */}
              {step === 2 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <h3 className="font-black text-white mb-1">Delivery Method</h3>
                  {summary.zone && <p className="text-xs text-slate-500 mb-4">Zone: <b className="text-slate-300">{summary.zone.name}</b> — standard fee {formatNPR(summary.zone.fee)}{summary.zone.freeThreshold > 0 && `, free over ${formatNPR(summary.zone.freeThreshold)}`}</p>}
                  <div className="space-y-3">
                    {METHODS.map((m) => {
                      const avail = methodAvailable(m.v);
                      return (
                        <button key={m.v} disabled={!avail} onClick={() => setMethod(m.v)}
                          className={`w-full text-left rounded-xl border-2 p-4 transition-all disabled:opacity-40 ${method === m.v ? "border-amber-500 bg-amber-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <Truck className="h-4 w-4 text-amber-400" /> {m.label}
                            {!avail && <span className="text-[10px] text-slate-500">(not available in your zone)</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                          {summary.zone && m.v !== "pickup" && (
                            <p className="text-xs text-slate-400 mt-1">
                              {m.v === "same_day" ? "Arrives today" : m.v === "express" ? `Arrives in ~${summary.zone.estDaysMin} day(s)` : `Arrives in ${summary.zone.estDaysMin}-${summary.zone.estDaysMax} days`}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex justify-between">
                    <button onClick={() => setStep(1)} className="h-11 px-6 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <button onClick={() => setStep(3)} className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Continue</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Payment */}
              {step === 3 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <h3 className="font-black text-white mb-4">Payment Method</h3>
                  <div className="space-y-3">
                    <button disabled={summary.zone ? !summary.zone.codEnabled : false} onClick={() => setPayMethod("cod")}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all disabled:opacity-40 ${payMethod === "cod" ? "border-amber-500 bg-amber-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-400" /> Cash on Delivery
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{summary.zone && !summary.zone.codEnabled ? "Not available in your zone" : "Pay in cash when your order arrives"}</p>
                    </button>
                    <button onClick={() => setPayMethod("esewa")}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${payMethod === "esewa" ? "border-amber-500 bg-amber-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="h-8 w-14 rounded-lg bg-[#60bb46] flex items-center justify-center text-[11px] font-black text-white">eSewa</span> eSewa Wallet
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Pay securely with your eSewa wallet. Verified server-side.</p>
                    </button>
                    <button onClick={() => setPayMethod("khalti")}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${payMethod === "khalti" ? "border-amber-500 bg-amber-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="h-8 w-14 rounded-lg bg-[#5c2d91] flex items-center justify-center text-[11px] font-black text-white">Khalti</span> Khalti Wallet
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Pay securely with your Khalti wallet. Verified server-side.</p>
                    </button>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-bold text-slate-400">Order note (optional)</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Delivery instructions..."
                      className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
                  </div>
                  <div className="mt-5">
                    <label className="text-xs font-bold text-slate-400">Coupon code</label>
                    <div className="mt-1 flex gap-2">
                      <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. SAVE10"
                        className="flex-1 h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none uppercase" />
                    </div>
                    {summary.coupon && <p className="mt-1.5 text-xs font-bold text-emerald-400">{summary.coupon.code} applied — {formatNPR(summary.coupon.discount)} off{summary.coupon.freeDelivery && " + free delivery"}</p>}
                    {summary.couponError && coupon && <p className="mt-1.5 text-xs font-bold text-rose-400">{summary.couponError}</p>}
                  </div>
                  <div className="mt-5 flex justify-between">
                    <button onClick={() => setStep(2)} className="h-11 px-6 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <button onClick={() => setStep(4)} className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Review Order</button>
                  </div>
                </div>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <h3 className="font-black text-white mb-4">Review & Place Order</h3>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {summary.lines.map((l) => (
                      <div key={l.cartItemId} className="flex items-center gap-3 rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
                        <span className="h-11 w-11 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700">{l.imageUrl ? <img src={l.imageUrl} alt={l.name} className="h-full w-full object-cover" /> : <span className="h-full w-full block" style={{ backgroundColor: l.imageColor }} />}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{l.name}</p>
                          <p className="text-[11px] text-slate-500">Qty {l.quantity} — {l.shopName}</p>
                        </div>
                        <p className="text-xs font-black text-white">{formatNPR(l.unitPrice * l.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
                      <p className="font-bold text-slate-400 mb-1">Ship To</p>
                      <p className="text-slate-200">{addresses.find((a) => a.id === addressId)?.recipient}, {addresses.find((a) => a.id === addressId)?.city}</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
                      <p className="font-bold text-slate-400 mb-1">Delivery</p>
                      <p className="text-slate-200 capitalize">{method.replace("_", " ")}</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
                      <p className="font-bold text-slate-400 mb-1">Payment</p>
                      <p className="text-slate-200">{payMethod === "cod" ? "Cash on Delivery" : payMethod === "esewa" ? "eSewa" : "Khalti"}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-between">
                    <button onClick={() => setStep(3)} className="h-11 px-6 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <button onClick={placeOrder} disabled={placing} className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> {placing ? "Placing order..." : `Place Order — ${formatNPR(summary.grandTotal)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 lg:sticky lg:top-36">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Summary</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Row label={`Subtotal (${summary.count})`} value={formatNPR(summary.subtotal)} />
                {summary.discount > 0 && <Row label="Discount" value={`-${formatNPR(summary.discount)}`} accent="text-emerald-400" />}
                {summary.tax > 0 && <Row label="Tax" value={formatNPR(summary.tax)} />}
                <Row label="Delivery" value={summary.deliveryFee === 0 ? "FREE" : formatNPR(summary.deliveryFee)} accent={summary.deliveryFee === 0 ? "text-emerald-400" : undefined} />
                <div className="flex justify-between pt-2 border-t border-slate-700/50">
                  <span className="font-black text-white">Total</span>
                  <span className="text-xl font-black text-amber-400">{formatNPR(summary.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

const inputCls = "h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold text-white ${accent ?? ""}`}>{value}</span>
    </div>
  );
}
