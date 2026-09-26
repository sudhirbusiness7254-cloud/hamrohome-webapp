"use client";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate, formatDateTime, ORDER_STATUS_META } from "@/lib/format";
import { Stars, Skeleton, EmptyState } from "@/components/ui";
import { inputCls, btnPrimary } from "./tabs-products";

// ---------------------------------------------------------------- orders
type VOrder = {
  id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
  grandTotal: number; createdAt: string; estimatedDelivery: string | null;
  myItems: { id: string; nameSnapshot: string; color: string | null; size: string | null; unitPrice: number; quantity: number; subtotal: number }[];
  shipTo: { recipient?: string; phone?: string; district?: string; city?: string; street?: string };
};

const NEXT_STATUS: Record<string, { to: string; label: string }[]> = {
  confirmed: [{ to: "processing", label: "Start Processing" }],
  processing: [{ to: "packed", label: "Mark as Packed" }],
  packed: [{ to: "shipped", label: "Mark as Shipped" }],
};

export function OrdersTab() {
  const [orders, setOrders] = useState<VOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");

  const load = async (f?: string) => {
    try {
      const d = await api<{ orders: VOrder[] }>(`/api/vendor/orders${f ? `?status=${f}` : ""}`);
      setOrders(d.orders);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const applyFilter = (f: string) => { setFilter(f); setLoading(true); load(f); };

  const advance = async (id: string, status: string) => {
    setBusy(id);
    try {
      await api("/api/vendor/orders", { method: "PATCH", body: { id, status } });
      await load(filter);
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-28 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">Orders ({orders.length})</h2>
        <select value={filter} onChange={(e) => applyFilter(e.target.value)} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="">All statuses</option>
          {["pending_payment", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_META[s]?.label}</option>
          ))}
        </select>
      </div>
      {orders.length === 0 && <EmptyState title="No orders" message="Orders containing your products will appear here." />}
      {orders.map((o) => {
        const meta = ORDER_STATUS_META[o.status];
        const share = o.myItems.reduce((a, i) => a + i.subtotal, 0);
        return (
          <div key={o.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-white">{o.orderNumber}</p>
                <p className="text-[11px] text-slate-500">{formatDateTime(o.createdAt)} • {o.shipTo.recipient} — {o.shipTo.phone} • {o.shipTo.city}, {o.shipTo.district}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}>{meta?.label}</span>
                <p className="mt-1 text-sm font-black text-amber-400">Your share: {formatNPR(share)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {o.myItems.map((it) => (
                <div key={it.id} className="flex justify-between text-xs rounded-lg bg-slate-900/60 border border-slate-700/50 px-3 py-2">
                  <span className="text-slate-200 font-semibold">{it.nameSnapshot} {[it.color, it.size].filter(Boolean).join(" / ")} × {it.quantity}</span>
                  <span className="text-white font-bold">{formatNPR(it.subtotal)}</span>
                </div>
              ))}
            </div>
            {NEXT_STATUS[o.status] && (
              <div className="mt-3 flex gap-2">
                {NEXT_STATUS[o.status].map((n) => (
                  <button key={n.to} disabled={busy === o.id} onClick={() => advance(o.id, n.to)}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white disabled:opacity-50">
                    {busy === o.id ? "Updating..." : n.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- returns
type VReturn = {
  ret: { id: string; reason: string; evidenceNote: string | null; status: string; refundAmount: number; createdAt: string; resolutionNote: string | null };
  orderNumber: string; customer: string; itemName: string; itemQty: number; itemSubtotal: number;
};

export function ReturnsTab() {
  const [rows, setRows] = useState<VReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      const d = await api<{ returns: VReturn[] }>("/api/vendor/returns");
      setRows(d.returns);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this return?`)) return;
    setBusy(id);
    try {
      await api("/api/vendor/returns", { method: "POST", body: { id, action, note } });
      setNote("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const color = (s: string) => ({ requested: "#f59e0b", approved: "#0ea5e9", rejected: "#ef4444", picked: "#6366f1", refunded: "#10b981" }[s] ?? "#64748b");

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Return Requests ({rows.length})</h2>
      {rows.length === 0 && <EmptyState title="No returns" message="Customer return requests for your products will appear here." />}
      {rows.map((r) => (
        <div key={r.ret.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{r.itemName} × {r.itemQty}</p>
              <p className="text-[11px] text-slate-500">Order {r.orderNumber} • {r.customer} • {formatDate(r.ret.createdAt)}</p>
              <p className="mt-1 text-xs text-slate-300">Reason: <b>{r.ret.reason}</b></p>
              {r.ret.evidenceNote && <p className="text-xs text-slate-500">{r.ret.evidenceNote}</p>}
              {r.ret.resolutionNote && <p className="text-xs text-slate-400">Resolution: {r.ret.resolutionNote}</p>}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize" style={{ backgroundColor: `${color(r.ret.status)}22`, color: color(r.ret.status) }}>{r.ret.status}</span>
              <p className="mt-1 text-sm font-black text-white">{formatNPR(r.itemSubtotal)}</p>
            </div>
          </div>
          {r.ret.status === "requested" && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for customer (optional)" className={`${inputCls} !h-10 flex-1`} />
              <div className="flex gap-2">
                <button disabled={busy === r.ret.id} onClick={() => act(r.ret.id, "approve")} className="h-10 px-4 rounded-xl bg-emerald-600 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Approve</button>
                <button disabled={busy === r.ret.id} onClick={() => act(r.ret.id, "reject")} className="h-10 px-4 rounded-xl bg-rose-600 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5"><X className="h-3.5 w-3.5" /> Reject</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- reviews
type VReview = {
  review: { id: string; rating: number; title: string | null; comment: string | null; verifiedPurchase: boolean; vendorReply: string | null; createdAt: string };
  productName: string; productSlug: string; userName: string;
};

export function ReviewsTab() {
  const [rows, setRows] = useState<VReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await api<{ reviews: VReview[] }>("/api/vendor/reviews");
      setRows(d.reviews);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const send = async (id: string) => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api("/api/reviews", { method: "POST", body: { op: "reply", id, text } });
      setReplying(null);
      setText("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Product Reviews ({rows.length})</h2>
      {rows.length === 0 && <EmptyState title="No reviews yet" message="Customer reviews on your products will appear here." />}
      {rows.map((r) => (
        <div key={r.review.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{r.productName}</p>
              <p className="text-[11px] text-slate-500">{r.userName} • {formatDate(r.review.createdAt)} {r.review.verifiedPurchase && "• Verified Purchase"}</p>
            </div>
            <Stars value={r.review.rating} size={13} />
          </div>
          {r.review.title && <p className="mt-1 text-sm font-bold text-slate-200">{r.review.title}</p>}
          {r.review.comment && <p className="text-sm text-slate-400">{r.review.comment}</p>}
          {r.review.vendorReply ? (
            <div className="mt-2 rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
              <p className="text-[11px] font-bold text-amber-400">Your Reply</p>
              <p className="text-sm text-slate-300">{r.review.vendorReply}</p>
            </div>
          ) : replying === r.review.id ? (
            <div className="mt-2 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply..." className={`${inputCls} !h-10 flex-1`} />
              <button disabled={busy} onClick={() => send(r.review.id)} className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white disabled:opacity-50">Send</button>
              <button onClick={() => setReplying(null)} className="h-10 px-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setReplying(r.review.id)} className="mt-2 text-xs font-bold text-amber-400 hover:underline">Reply to review</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function opsHelper() {
  return btnPrimary;
}
