"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Package, RotateCcw, Star, MapPin, Bell, MessageSquare, Plus, Check,
  ChevronLeft, Truck, X, Send, BadgeCheck,
} from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate, formatDateTime, ORDER_STATUS_META, PAYMENT_METHOD_LABEL, timeAgo } from "@/lib/format";
import { Stars, Skeleton, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/lib/store";

const MOBILE_TABS = [
  { v: "profile", label: "Profile" }, { v: "orders", label: "Orders" }, { v: "returns", label: "Returns" },
  { v: "reviews", label: "Reviews" }, { v: "addresses", label: "Addresses" },
  { v: "notifications", label: "Alerts" }, { v: "support", label: "Support" },
];

function AccountInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab") || "profile";
  const orderParam = sp.get("order");
  const ticketParam = sp.get("ticket");

  return (
    <div>
      {/* Mobile tab bar */}
      <div className="md:hidden scroll-row flex gap-2 overflow-x-auto pb-3 mb-2">
        {MOBILE_TABS.map((t) => (
          <Link key={t.v} href={`/account?tab=${t.v}`}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.v ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "orders" && (orderParam ? <OrderDetail id={orderParam} onBack={() => router.push("/account?tab=orders")} /> : <OrdersTab />)}
      {tab === "returns" && <ReturnsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "addresses" && <AddressesTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "support" && (ticketParam ? <TicketDetail id={ticketParam} onBack={() => router.push("/account?tab=support")} /> : <SupportTab />)}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading...</div>}>
      <AccountInner />
    </Suspense>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 ${className}`}>{children}</div>;
}
const inputCls = "w-full h-11 rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";
const btnPrimary = "h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50";

// ---------------------------------------------------------------- profile
function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [pMsg, setPMsg] = useState("");
  const [pSaving, setPSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const d = await api<{ user: { name: string; phone: string | null } & Record<string, unknown> }>("/api/auth/me", { method: "PATCH", body: { name, phone: phone || null } });
      setUser({ ...user!, name: d.user.name, phone: d.user.phone });
      setMsg("Profile updated successfully");
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPSaving(true);
    setPMsg("");
    try {
      await api("/api/auth/password", { method: "PATCH", body: { current: cur, next } });
      setPMsg("Password changed successfully");
      setCur("");
      setNext("");
    } catch (e) {
      setPMsg(errMsg(e));
    } finally {
      setPSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-black text-white">Profile Information</h2>
        <form onSubmit={save} className="mt-4 grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-400">Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={`${inputCls} mt-1`} /></div>
          <div><label className="text-xs font-bold text-slate-400">Email</label><input value={user?.email ?? ""} disabled className={`${inputCls} mt-1 opacity-60`} /></div>
          <div><label className="text-xs font-bold text-slate-400">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" className={`${inputCls} mt-1`} /></div>
          <div><label className="text-xs font-bold text-slate-400">Role</label><input value={user?.role ?? ""} disabled className={`${inputCls} mt-1 opacity-60 capitalize`} /></div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
            {msg && <span className="text-xs font-bold text-emerald-400">{msg}</span>}
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="text-lg font-black text-white">Change Password</h2>
        <form onSubmit={changePw} className="mt-4 grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-400">Current Password</label><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required className={`${inputCls} mt-1`} /></div>
          <div><label className="text-xs font-bold text-slate-400">New Password (8+ chars)</label><input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} className={`${inputCls} mt-1`} /></div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button disabled={pSaving} className={btnPrimary}>{pSaving ? "Updating..." : "Update Password"}</button>
            {pMsg && <span className="text-xs font-bold text-emerald-400">{pMsg}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- orders
type OrderRow = {
  order: {
    id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
    grandTotal: number; createdAt: string; estimatedDelivery: string | null;
  };
  itemCount: number; preview: string; previewColor: string; previewImage: string | null;
};

function OrdersTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ orders: OrderRow[] }>("/api/orders?limit=50");
        setOrders(d.orders);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /><Skeleton className="h-24 !bg-slate-800" /></div>;
  if (orders.length === 0) {
    return <EmptyState icon={<Package className="h-12 w-12" />} title="No orders yet" message="Your order history will appear here."
      action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Start Shopping</Link>} />;
  }
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">My Orders ({orders.length})</h2>
      {orders.map(({ order: o, itemCount, preview, previewColor, previewImage }) => {
        const meta = ORDER_STATUS_META[o.status];
        return (
          <Link key={o.id} href={`/account?tab=orders&order=${o.id}`} className="block rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-xl flex-shrink-0 overflow-hidden bg-slate-700">{previewImage ? <img src={previewImage} alt={preview} className="h-full w-full object-cover" /> : <span className="h-full w-full block" style={{ backgroundColor: previewColor || "#64748b" }} />}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">{o.orderNumber}</p>
                <p className="text-xs text-slate-400 truncate">{preview}{itemCount > 1 ? ` +${itemCount - 1} more` : ""}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(o.createdAt)} • {PAYMENT_METHOD_LABEL[o.paymentMethod]}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-white">{formatNPR(o.grandTotal)}</p>
                <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}>{meta?.label}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type OrderDetailData = {
  order: OrderRow["order"] & {
    subtotal: number; discountTotal: number; taxTotal: number; deliveryFee: number; couponCode: string | null;
    addressSnapshot: { recipient: string; phone: string; street: string; city: string; district: string };
    deliveryMethod: string; cancelReason?: string | null;
  };
  items: { item: { id: string; nameSnapshot: string; skuSnapshot: string; color: string | null; size: string | null; imageColor: string | null; imageUrl: string | null; unitPrice: number; quantity: number; subtotal: number }; slug: string | null; vendorShop: string | null }[];
  history: { toStatus: string; note: string | null; createdAt: string }[];
  payment: { provider: string; status: string; transactionId: string | null; gatewayRef: string | null } | null;
  returns: { id: string; orderItemId: string; status: string }[];
};

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [showReturn, setShowReturn] = useState<string | null>(null);
  const [reason, setReason] = useState("Damaged");
  const [evidence, setEvidence] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await api<OrderDetailData>(`/api/orders?id=${id}`);
      setData(d);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const cancel = async () => {
    if (!confirm("Cancel this order? Stock will be restored.")) return;
    setBusy("cancel");
    try {
      await api("/api/orders", { method: "POST", body: { op: "cancel", id } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const retryPay = async (provider: "esewa" | "khalti") => {
    setBusy("pay");
    try {
      const r = await api<{ redirectUrl: string }>("/api/payments", { method: "POST", body: { op: "create", orderId: id, provider } });
      window.location.href = r.redirectUrl;
    } catch (e) {
      alert(errMsg(e));
      setBusy("");
    }
  };

  const submitReturn = async (orderItemId: string) => {
    setBusy("return");
    try {
      await api("/api/orders", { method: "POST", body: { op: "return", id, orderItemId, reason, evidenceNote: evidence } });
      setShowReturn(null);
      setEvidence("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-40 !bg-slate-800" /><Skeleton className="h-40 !bg-slate-800" /></div>;
  if (!data) return <EmptyState title="Order not found" message={msg} action={<button onClick={onBack} className={btnPrimary}>Back to Orders</button>} />;

  const o = data.order;
  const meta = ORDER_STATUS_META[o.status];
  const canCancel = ["pending_payment", "payment_failed", "confirmed", "processing"].includes(o.status);
  const steps = ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
  const stepIdx = o.status === "payment_verified" ? 0 : steps.indexOf(o.status);
  const returnedItems = new Set(data.returns.filter((r) => ["requested", "approved", "picked"].includes(r.status)).map((r) => r.orderItemId));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Back to Orders</button>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">{o.orderNumber}</h2>
            <p className="text-xs text-slate-500">Placed {formatDateTime(o.createdAt)} • {PAYMENT_METHOD_LABEL[o.paymentMethod]}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black px-3 py-1 rounded-full" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}>{meta?.label}</span>
            <p className="mt-1 text-lg font-black text-amber-400">{formatNPR(o.grandTotal)}</p>
          </div>
        </div>

        {/* Timeline */}
        {!["cancelled", "refunded", "return_requested", "return_approved"].includes(o.status) && (
          <div className="mt-5 flex items-center">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black ${i <= stepIdx ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-700 text-slate-500"}`}>
                    {i <= stepIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={`mt-1 text-[9px] font-bold hidden sm:block ${i <= stepIdx ? "text-slate-200" : "text-slate-600"}`}>{ORDER_STATUS_META[s].label}</span>
                </div>
                {i < steps.length - 1 && <span className={`flex-1 h-0.5 mx-1 rounded mb-0 sm:mb-4 ${i < stepIdx ? "bg-amber-500" : "bg-slate-700"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(o.status === "pending_payment" || o.status === "payment_failed") && (
            <>
              <button disabled={busy === "pay"} onClick={() => retryPay("esewa")} className="h-10 px-5 rounded-xl bg-[#60bb46] text-xs font-bold text-white disabled:opacity-50">Pay with eSewa</button>
              <button disabled={busy === "pay"} onClick={() => retryPay("khalti")} className="h-10 px-5 rounded-xl bg-[#5c2d91] text-xs font-bold text-white disabled:opacity-50">Pay with Khalti</button>
            </>
          )}
          {canCancel && <button disabled={busy === "cancel"} onClick={cancel} className="h-10 px-5 rounded-xl border border-rose-500/50 text-xs font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50">{busy === "cancel" ? "Cancelling..." : "Cancel Order"}</button>}
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-white mb-3">Items</h3>
        <div className="space-y-3">
          {data.items.map(({ item: it, slug, vendorShop }) => (
            <div key={it.id} className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 rounded-xl flex-shrink-0 overflow-hidden bg-slate-700">{it.imageUrl ? <img src={it.imageUrl} alt={it.nameSnapshot} className="h-full w-full object-cover" /> : <span className="h-full w-full block" style={{ backgroundColor: it.imageColor || "#64748b" }} />}</span>
                <div className="flex-1 min-w-0">
                  {slug ? <Link href={`/products/${slug}`} className="text-sm font-bold text-white hover:text-amber-400 truncate block">{it.nameSnapshot}</Link>
                    : <p className="text-sm font-bold text-white truncate">{it.nameSnapshot}</p>}
                  <p className="text-[11px] text-slate-500">{[it.color, it.size].filter(Boolean).join(" / ")} • Qty {it.quantity} • {vendorShop}</p>
                </div>
                <p className="text-sm font-black text-white">{formatNPR(it.subtotal)}</p>
              </div>
              {o.status === "delivered" && !returnedItems.has(it.id) && (
                <div className="mt-2">
                  {showReturn === it.id ? (
                    <div className="rounded-xl border border-slate-700 p-3 space-y-2">
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-slate-700 px-3 text-xs text-white">
                        {["Damaged", "Wrong product", "Defective", "Missing item", "Size issue", "Other"].map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Describe the issue..." rows={2} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-600" />
                      <div className="flex gap-2">
                        <button disabled={busy === "return"} onClick={() => submitReturn(it.id)} className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white disabled:opacity-50">{busy === "return" ? "Submitting..." : "Submit Return"}</button>
                        <button onClick={() => setShowReturn(null)} className="h-9 px-4 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowReturn(it.id)} className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Request Return</button>
                  )}
                </div>
              )}
              {returnedItems.has(it.id) && <p className="mt-1 text-[11px] font-bold text-amber-400">Return in progress</p>}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-200 font-bold">{formatNPR(o.subtotal)}</span></div>
          {o.discountTotal > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount{o.couponCode ? ` (${o.couponCode})` : ""}</span><span className="text-emerald-400 font-bold">-{formatNPR(o.discountTotal)}</span></div>}
          {o.taxTotal > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="text-slate-200 font-bold">{formatNPR(o.taxTotal)}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Delivery ({o.deliveryMethod.replace("_", " ")})</span><span className="text-slate-200 font-bold">{o.deliveryFee === 0 ? "FREE" : formatNPR(o.deliveryFee)}</span></div>
          <div className="flex justify-between pt-1"><span className="text-slate-200 font-bold">Total</span><span className="text-amber-400 font-black text-sm">{formatNPR(o.grandTotal)}</span></div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-black text-white text-sm mb-2">Delivery Address</h3>
          <p className="text-sm text-slate-300">{o.addressSnapshot.recipient} — {o.addressSnapshot.phone}</p>
          <p className="text-xs text-slate-500">{o.addressSnapshot.street}, {o.addressSnapshot.city}, {o.addressSnapshot.district}</p>
        </Card>
        <Card>
          <h3 className="font-black text-white text-sm mb-2">Status History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.history.map((h, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="font-bold" style={{ color: ORDER_STATUS_META[h.toStatus]?.color }}>{ORDER_STATUS_META[h.toStatus]?.label}</span>
                <span className="text-slate-500">{formatDateTime(h.createdAt)}</span>
              </div>
            ))}
          </div>
          {data.payment && <p className="mt-2 text-[11px] text-slate-500">Txn: {data.payment.transactionId}{data.payment.gatewayRef ? ` • Ref: ${data.payment.gatewayRef}` : ""} • {data.payment.status}</p>}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- returns
function ReturnsTab() {
  const [rows, setRows] = useState<{ ret: { id: string; reason: string; status: string; refundAmount: number; createdAt: string; resolutionNote: string | null }; orderNumber: string; itemName: string; itemSubtotal: number; shopName: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ returns: typeof rows }>("/api/orders?view=returns");
        setRows(d.returns);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const color = (s: string) => ({ requested: "#f59e0b", approved: "#0ea5e9", rejected: "#ef4444", picked: "#6366f1", refunded: "#10b981" }[s] ?? "#64748b");

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  if (rows.length === 0) return <EmptyState icon={<RotateCcw className="h-12 w-12" />} title="No returns" message="Your return requests and refunds will appear here." />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Returns & Refunds</h2>
      {rows.map((r) => (
        <Card key={r.ret.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{r.itemName}</p>
              <p className="text-xs text-slate-500">Order {r.orderNumber} {r.shopName ? `• ${r.shopName}` : ""} • {formatDate(r.ret.createdAt)}</p>
              <p className="mt-1 text-xs text-slate-400">Reason: {r.ret.reason}</p>
              {r.ret.resolutionNote && <p className="text-xs text-slate-400">Note: {r.ret.resolutionNote}</p>}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize" style={{ backgroundColor: `${color(r.ret.status)}22`, color: color(r.ret.status) }}>{r.ret.status}</span>
              <p className="mt-1 text-sm font-black text-white">{formatNPR(r.itemSubtotal)}</p>
              {r.ret.status === "refunded" && <p className="text-[11px] text-emerald-400 font-bold">Refunded {formatNPR(r.ret.refundAmount)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- reviews
function ReviewsTab() {
  const [rows, setRows] = useState<{ review: { id: string; rating: number; title: string | null; comment: string | null; verifiedPurchase: boolean; vendorReply: string | null; createdAt: string }; productName: string; productSlug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ reviews: typeof rows }>("/api/reviews?view=mine");
        setRows(d.reviews);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  if (rows.length === 0) return <EmptyState icon={<Star className="h-12 w-12" />} title="No reviews yet" message="Review products from your delivered orders to help other shoppers." />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">My Reviews</h2>
      {rows.map((r) => (
        <Card key={r.review.id}>
          <div className="flex items-start justify-between gap-2">
            <Link href={`/products/${r.productSlug}`} className="text-sm font-bold text-white hover:text-amber-400">{r.productName}</Link>
            <Stars value={r.review.rating} size={13} />
          </div>
          {r.review.title && <p className="mt-1 text-sm font-bold text-slate-200">{r.review.title}</p>}
          {r.review.comment && <p className="text-sm text-slate-400">{r.review.comment}</p>}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            {r.review.verifiedPurchase && <span className="flex items-center gap-1 text-emerald-400 font-bold"><BadgeCheck className="h-3 w-3" /> Verified</span>}
            <span>{formatDate(r.review.createdAt)}</span>
          </div>
          {r.review.vendorReply && <div className="mt-2 rounded-xl bg-slate-900/60 border border-slate-700/50 p-3"><p className="text-[11px] font-bold text-amber-400">Seller Response</p><p className="text-sm text-slate-300">{r.review.vendorReply}</p></div>}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- addresses
type Addr = { id: string; label: string; recipient: string; phone: string; province: string; district: string; city: string; ward: string | null; street: string; landmark: string | null; isDefault: boolean };

function AddressesTab() {
  const [rows, setRows] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Addr | null>(null);
  const [form, setForm] = useState({ label: "Home", recipient: "", phone: "", province: "Bagmati", district: "Kathmandu", city: "", ward: "", street: "", landmark: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const d = await api<{ addresses: Addr[] }>("/api/addresses");
      setRows(d.addresses);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ label: "Home", recipient: "", phone: "", province: "Bagmati", district: "Kathmandu", city: "", ward: "", street: "", landmark: "" });
    setShow(true);
  };
  const openEdit = (a: Addr) => {
    setEditing(a);
    setForm({ label: a.label, recipient: a.recipient, phone: a.phone, province: a.province, district: a.district, city: a.city, ward: a.ward || "", street: a.street, landmark: a.landmark || "" });
    setShow(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api("/api/addresses", { method: "PATCH", body: { id: editing.id, ...form } });
      else await api("/api/addresses", { method: "POST", body: form });
      setShow(false);
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api(`/api/addresses?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await api("/api/addresses", { method: "PATCH", body: { id, isDefault: true } });
      await load();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Saved Addresses</h2>
        <button onClick={openNew} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> Add New</button>
      </div>
      {show && (
        <Card>
          <h3 className="font-bold text-white text-sm mb-3">{editing ? "Edit Address" : "New Address"}</h3>
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
            <input required placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
            <input required placeholder="Recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} className={inputCls} />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            <input required placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inputCls} />
            <input required placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputCls} />
            <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
            <input placeholder="Ward" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} className={inputCls} />
            <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={inputCls} />
            <input required placeholder="Street / Tole" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <div className="sm:col-span-2 flex gap-2">
              <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Address"}</button>
              <button type="button" onClick={() => setShow(false)} className="h-11 px-6 rounded-xl border border-slate-700 text-sm font-bold text-slate-300">Cancel</button>
            </div>
          </form>
        </Card>
      )}
      {rows.length === 0 && !show && <EmptyState icon={<MapPin className="h-12 w-12" />} title="No addresses" message="Add a delivery address for faster checkout." />}
      {rows.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> {a.label}
                {a.isDefault && <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5">DEFAULT</span>}</p>
              <p className="mt-1 text-sm text-slate-300">{a.recipient} — {a.phone}</p>
              <p className="text-xs text-slate-500">{a.street}, {a.city}{a.ward ? `-${a.ward}` : ""}, {a.district}, {a.province}</p>
            </div>
            <div className="flex gap-2">
              {!a.isDefault && <button onClick={() => makeDefault(a.id)} className="text-xs font-bold text-emerald-400 hover:underline">Set Default</button>}
              <button onClick={() => openEdit(a)} className="text-xs font-bold text-amber-400 hover:underline">Edit</button>
              <button onClick={() => remove(a.id)} className="text-xs font-bold text-rose-400 hover:underline">Delete</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- notifications
function NotificationsTab() {
  const [items, setItems] = useState<{ id: string; type: string; title: string; body: string | null; link: string | null; isRead: boolean; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await api<{ items: typeof items }>("/api/notifications");
      setItems(d.items);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await api("/api/notifications", { method: "POST", body: { all: true } });
    setItems(items.map((i) => ({ ...i, isRead: true })));
  };
  const open = async (n: (typeof items)[0]) => {
    if (!n.isRead) {
      await api("/api/notifications", { method: "POST", body: { id: n.id } });
      setItems(items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    }
    if (n.link) window.location.href = n.link;
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-20 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Notifications</h2>
        {items.some((i) => !i.isRead) && <button onClick={markAll} className="text-xs font-bold text-amber-400 hover:underline">Mark all as read</button>}
      </div>
      {items.length === 0 && <EmptyState icon={<Bell className="h-12 w-12" />} title="No notifications" message="Order updates, offers and alerts will appear here." />}
      {items.map((n) => (
        <button key={n.id} onClick={() => open(n)} className={`w-full text-left rounded-2xl border p-4 transition-all ${n.isRead ? "border-slate-700/50 bg-slate-800/50" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className="flex items-start gap-3">
            <span className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.isRead ? "bg-slate-700" : "bg-amber-500/20"}`}>
              {n.type === "order" ? <Truck className="h-4 w-4 text-amber-400" /> : n.type === "support" ? <MessageSquare className="h-4 w-4 text-sky-400" /> : <Bell className="h-4 w-4 text-amber-400" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{n.title}</p>
              {n.body && <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>}
              <p className="text-[11px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.isRead && <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0 mt-1" />}
          </div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- support
type Ticket = { id: string; ticketNumber: string; subject: string; category: string; status: string; createdAt: string; updatedAt: string };

function SupportTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("order");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const load = async () => {
    try {
      const d = await api<{ tickets: Ticket[] }>("/api/support");
      setTickets(d.tickets);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const d = await api<{ ticket: Ticket }>("/api/support", { method: "POST", body: { subject, category, message } });
      router.push(`/account?tab=support&ticket=${d.ticket.id}`);
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const color = (s: string) => ({ open: "#0ea5e9", in_progress: "#f59e0b", waiting_for_customer: "#d946ef", resolved: "#10b981", closed: "#64748b" }[s] ?? "#64748b");

  if (loading) return <div className="space-y-3"><Skeleton className="h-20 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Support Tickets</h2>
        <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> New Ticket</button>
      </div>
      {show && (
        <Card>
          <form onSubmit={create} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input required minLength={4} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {["payment", "order", "delivery", "return", "refund", "product", "account", "other"].map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
            <textarea required minLength={4} rows={4} placeholder="Describe your issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
            <button disabled={saving} className={btnPrimary}>{saving ? "Creating..." : "Submit Ticket"}</button>
          </form>
        </Card>
      )}
      {tickets.length === 0 && !show && <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="No tickets" message="Need help? Create a support ticket and our team will respond." />}
      {tickets.map((t) => (
        <Link key={t.id} href={`/account?tab=support&ticket=${t.id}`} className="block rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{t.subject}</p>
              <p className="text-[11px] text-slate-500">{t.ticketNumber} • {t.category} • {timeAgo(t.updatedAt)}</p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize flex-shrink-0" style={{ backgroundColor: `${color(t.status)}22`, color: color(t.status) }}>{t.status.replace(/_/g, " ")}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TicketDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{ ticket: Ticket; messages: { msg: { id: string; body: string; isStaff: boolean; createdAt: string }; senderName: string | null }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const d = await api<typeof data>(`/api/support?id=${id}`);
      setData(d);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api("/api/support", { method: "POST", body: { op: "message", id, body: reply } });
      setReply("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-40 !bg-slate-800" /></div>;
  if (!data) return <EmptyState title="Ticket not found" action={<button onClick={onBack} className={btnPrimary}>Back</button>} />;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Back to Tickets</button>
      <Card>
        <p className="text-[11px] font-bold text-slate-500">{data.ticket.ticketNumber} • {data.ticket.category}</p>
        <h2 className="text-lg font-black text-white">{data.ticket.subject}</h2>
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
          {data.messages.map((m) => (
            <div key={m.msg.id} className={`flex ${m.msg.isStaff ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.msg.isStaff ? "bg-slate-700/60 rounded-tl-sm" : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/20 rounded-tr-sm"}`}>
                <p className="text-[11px] font-bold text-slate-400">{m.msg.isStaff ? `Support — ${m.senderName || "Agent"}` : "You"}</p>
                <p className="mt-0.5 text-sm text-slate-100 whitespace-pre-line">{m.msg.body}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(m.msg.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
        {data.ticket.status !== "closed" ? (
          <form onSubmit={send} className="mt-4 flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." className={`${inputCls} flex-1`} />
            <button disabled={sending} className="h-11 w-11 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5"><X className="h-3 w-3" /> This ticket is closed.</p>
        )}
      </Card>
    </div>
  );
}
