"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate, formatDateTime, ORDER_STATUS_META, PAYMENT_METHOD_LABEL, timeAgo } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";
import { inputCls, btnPrimary } from "./tabs-catalog";

const ALL_STATUSES = ["pending_payment", "payment_failed", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested", "return_approved", "refunded"];

// ---------------------------------------------------------------- orders
type AOrder = {
  order: { id: string; orderNumber: string; status: string; paymentMethod: string; grandTotal: number; createdAt: string };
  customer: string;
};

export function OrdersTab() {
  const [orders, setOrders] = useState<AOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async (f = filter, qq = query, pg = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f) params.set("status", f);
      if (qq) params.set("q", qq);
      params.set("page", String(pg));
      const d = await api<{ orders: AOrder[]; total: number }>("/api/admin/orders?" + params.toString());
      setOrders(d.orders);
      setPages(Math.max(1, Math.ceil(d.total / 20)));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (selected) return <OrderDetail id={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black text-white mr-auto">Orders</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(filter, query, 1))} placeholder="Search order no..."
          className="h-10 w-44 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); load(e.target.value, query, 1); }} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_META[s]?.label}</option>)}
        </select>
      </div>
      {loading ? <Skeleton className="h-40 !bg-slate-800" /> : orders.length === 0 ? <EmptyState title="No orders" message="No orders match your filters." /> : (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/40">
                {orders.map(({ order: o, customer }) => {
                  const meta = ORDER_STATUS_META[o.status];
                  return (
                    <tr key={o.id} onClick={() => setSelected(o.id)} className="hover:bg-slate-800/60 cursor-pointer">
                      <td className="px-4 py-3"><p className="font-bold text-white">{o.orderNumber}</p><p className="text-[11px] text-slate-500">{formatDate(o.createdAt)}</p></td>
                      <td className="px-4 py-3 text-slate-300">{customer}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</td>
                      <td className="px-4 py-3 font-black text-white">{formatNPR(o.grandTotal)}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}>{meta?.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(filter, query, page - 1); }} className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30">Prev</button>
          <span className="text-xs text-slate-500 leading-9">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => { setPage(page + 1); load(filter, query, page + 1); }} className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}

type OrderFull = {
  order: { id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string; grandTotal: number; subtotal: number; discountTotal: number; deliveryFee: number; estimatedDelivery: string | null; addressSnapshot: { recipient: string; phone: string; street: string; city: string; district: string } };
  items: { item: { nameSnapshot: string; quantity: number; unitPrice: number; subtotal: number }; shopName: string | null }[];
  history: { fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }[];
  payments: { provider: string; status: string; transactionId: string | null; gatewayRef: string | null; amount: number }[];
  customer: { name: string; email: string; phone: string | null } | null;
};

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<OrderFull | null>(null);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await api<OrderFull>(`/api/admin/orders?id=${id}`);
      setData(d);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const update = async () => {
    if (!to) return;
    setBusy(true);
    try {
      await api("/api/admin/orders", { method: "PATCH", body: { id, status: to, note } });
      setTo("");
      setNote("");
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Skeleton className="h-64 !bg-slate-800" />;
  const o = data.order;
  const meta = ORDER_STATUS_META[o.status];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Back to Orders</button>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">{o.orderNumber}</h2>
            <p className="text-xs text-slate-500">{data.customer?.name} • {data.customer?.email} • {data.customer?.phone}</p>
            <p className="text-xs text-slate-500">{o.addressSnapshot.recipient}, {o.addressSnapshot.street}, {o.addressSnapshot.city}, {o.addressSnapshot.district}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black px-3 py-1 rounded-full" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}>{meta?.label}</span>
            <p className="mt-1 text-lg font-black text-amber-400">{formatNPR(o.grandTotal)}</p>
            <p className="text-[11px] text-slate-500">{PAYMENT_METHOD_LABEL[o.paymentMethod]} • {o.paymentStatus}</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {data.items.map((x, i) => (
            <div key={i} className="flex justify-between text-xs rounded-lg bg-slate-900/60 border border-slate-700/50 px-3 py-2">
              <span className="text-slate-200">{x.item.nameSnapshot} × {x.item.quantity} {x.shopName ? `(${x.shopName})` : ""}</span>
              <span className="text-white font-bold">{formatNPR(x.item.subtotal)}</span>
            </div>
          ))}
        </div>
        {data.payments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {data.payments.map((p, i) => (
              <p key={i} className="text-[11px] text-slate-500">Payment: {p.provider} • {p.transactionId}{p.gatewayRef ? ` • ref ${p.gatewayRef}` : ""} • {p.status} • {formatNPR(p.amount)}</p>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <select value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white">
            <option value="">Change status to...</option>
            {ALL_STATUSES.filter((s) => s !== o.status).map((s) => <option key={s} value={s} className="bg-slate-900">{ORDER_STATUS_META[s]?.label}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (visible to customer)" className={`${inputCls} flex-1`} />
          <button disabled={busy || !to} onClick={update} className={btnPrimary}>{busy ? "Updating..." : "Update"}</button>
        </div>
        <div className="mt-4 space-y-1.5">
          {data.history.map((h, i) => (
            <p key={i} className="text-[11px] text-slate-500">
              <b style={{ color: ORDER_STATUS_META[h.toStatus]?.color }}>{ORDER_STATUS_META[h.toStatus]?.label}</b> — {formatDateTime(h.createdAt)}{h.note ? ` — ${h.note}` : ""}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- returns
type ARet = {
  ret: { id: string; reason: string; status: string; refundAmount: number; createdAt: string; resolutionNote: string | null };
  orderNumber: string; customer: string; itemName: string; itemSubtotal: number; shopName: string | null;
};

export function ReturnsTab() {
  const [rows, setRows] = useState<ARet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");

  const load = async (f = filter) => {
    try {
      const d = await api<{ returns: ARet[] }>(`/api/admin/returns${f ? `?status=${f}` : ""}`);
      setRows(d.returns);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const act = async (id: string, action: string) => {
    if (!confirm(`${action} this return?`)) return;
    setBusy(id);
    try {
      await api("/api/admin/returns", { method: "POST", body: { id, action } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const color = (s: string) => ({ requested: "#f59e0b", approved: "#0ea5e9", rejected: "#ef4444", picked: "#6366f1", refunded: "#10b981" }[s] ?? "#64748b");
  const actions: Record<string, string[]> = { requested: ["approve", "reject"], approved: ["picked", "refund"], picked: ["refund"] };

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-white mr-auto">Returns & Refunds</h2>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setLoading(true); load(e.target.value); }} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
          <option value="">All</option>
          {["requested", "approved", "picked", "refunded", "rejected"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>
      {rows.length === 0 && <EmptyState title="No returns" message="No return requests found." />}
      {rows.map((r) => (
        <div key={r.ret.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{r.itemName} — {formatNPR(r.itemSubtotal)}</p>
              <p className="text-[11px] text-slate-500">Order {r.orderNumber} • {r.customer} {r.shopName ? `• ${r.shopName}` : ""} • {formatDate(r.ret.createdAt)}</p>
              <p className="text-xs text-slate-300 mt-1">Reason: {r.ret.reason}</p>
              {r.ret.resolutionNote && <p className="text-xs text-slate-500">Note: {r.ret.resolutionNote}</p>}
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize h-fit" style={{ backgroundColor: `${color(r.ret.status)}22`, color: color(r.ret.status) }}>{r.ret.status}</span>
          </div>
          {actions[r.ret.status] && (
            <div className="mt-3 flex gap-2">
              {actions[r.ret.status].map((a) => (
                <button key={a} disabled={busy === r.ret.id} onClick={() => act(r.ret.id, a)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold text-white disabled:opacity-50 capitalize ${a === "reject" ? "bg-rose-600" : a === "refund" ? "bg-emerald-600" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}>
                  {busy === r.ret.id ? "..." : a}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- withdrawals
export function WithdrawalsTab() {
  const [rows, setRows] = useState<{ wd: { id: string; amount: number; status: string; createdAt: string; note: string | null }; shopName: string | null; owner: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const d = await api<{ withdrawals: typeof rows }>("/api/admin/withdrawals");
      setRows(d.withdrawals);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: string) => {
    if (!confirm(`${action} this withdrawal?`)) return;
    setBusy(id);
    try {
      await api("/api/admin/withdrawals", { method: "POST", body: { id, action } });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const next: Record<string, string[]> = { requested: ["approve", "reject"], approved: ["processing", "reject"], processing: ["paid"] };

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Withdrawal Requests</h2>
      {rows.length === 0 && <EmptyState title="No withdrawals" message="Vendor payout requests will appear here." />}
      {rows.map((r) => (
        <div key={r.wd.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">{r.shopName || r.owner} — {formatNPR(r.wd.amount)}</p>
            <p className="text-[11px] text-slate-500">{formatDateTime(r.wd.createdAt)}{r.wd.note ? ` • ${r.wd.note}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize bg-slate-700 text-slate-200">{r.wd.status}</span>
            {(next[r.wd.status] || []).map((a) => (
              <button key={a} disabled={busy === r.wd.id} onClick={() => act(r.wd.id, a)}
                className={`h-9 px-4 rounded-xl text-xs font-bold text-white disabled:opacity-50 capitalize ${a === "reject" ? "bg-rose-600" : a === "paid" ? "bg-emerald-600" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- support (admin)
type ATicket = { ticket: { id: string; ticketNumber: string; subject: string; category: string; status: string; updatedAt: string }; userName: string; userEmail: string };

export function SupportTab() {
  const [tickets, setTickets] = useState<ATicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    try {
      const d = await api<{ tickets: ATicket[] }>("/api/support");
      setTickets(d.tickets);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (selected) return <AdminTicket id={selected} onBack={() => { setSelected(null); load(); }} />;

  const color = (s: string) => ({ open: "#0ea5e9", in_progress: "#f59e0b", waiting_for_customer: "#d946ef", resolved: "#10b981", closed: "#64748b" }[s] ?? "#64748b");

  if (loading) return <Skeleton className="h-40 !bg-slate-800" />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Support Tickets ({tickets.length})</h2>
      {tickets.length === 0 && <EmptyState title="No tickets" message="Customer support tickets will appear here." />}
      {tickets.map((t) => (
        <button key={t.ticket.id} onClick={() => setSelected(t.ticket.id)} className="w-full text-left rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{t.ticket.subject}</p>
              <p className="text-[11px] text-slate-500">{t.ticket.ticketNumber} • {t.userName} ({t.userEmail}) • {timeAgo(t.ticket.updatedAt)}</p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize flex-shrink-0" style={{ backgroundColor: `${color(t.ticket.status)}22`, color: color(t.ticket.status) }}>{t.ticket.status.replace(/_/g, " ")}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function AdminTicket({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{ ticket: { subject: string; ticketNumber: string; status: string; category: string }; messages: { msg: { id: string; body: string; isStaff: boolean; createdAt: string }; senderName: string | null }[]; owner: { name: string; email: string } | null } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await api<typeof data>(`/api/support?id=${id}`);
      setData(d);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api("/api/support", { method: "POST", body: { op: "message", id, body: reply } });
      setReply("");
      await load();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: string) => {
    try {
      await api("/api/support", { method: "PATCH", body: { id, status } });
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  if (!data) return <Skeleton className="h-64 !bg-slate-800" />;
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Back</button>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
        <p className="text-[11px] font-bold text-slate-500">{data.ticket.ticketNumber} • {data.owner?.name} ({data.owner?.email})</p>
        <h2 className="text-lg font-black text-white">{data.ticket.subject}</h2>
        <div className="mt-2 flex gap-2 flex-wrap">
          {["open", "in_progress", "waiting_for_customer", "resolved", "closed"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`h-8 px-3 rounded-lg text-[11px] font-bold capitalize ${data.ticket.status === s ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-300"}`}>{s.replace(/_/g, " ")}</button>
          ))}
        </div>
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
          {data.messages.map((m) => (
            <div key={m.msg.id} className={`flex ${m.msg.isStaff ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.msg.isStaff ? "bg-amber-500/15 border border-amber-500/20" : "bg-slate-700/60"}`}>
                <p className="text-[11px] font-bold text-slate-400">{m.msg.isStaff ? `Staff — ${m.senderName}` : data.owner?.name}</p>
                <p className="mt-0.5 text-sm text-slate-100 whitespace-pre-line">{m.msg.body}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(m.msg.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as support..." className={`${inputCls} flex-1`} />
          <button disabled={busy} className="h-11 w-11 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- audit
export function AuditTab() {
  const [logs, setLogs] = useState<{ id: string; actorName: string | null; action: string; entityType: string | null; entityId: string | null; ip: string | null; createdAt: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async (pg = 1) => {
    try {
      const d = await api<{ logs: typeof logs; total: number }>(`/api/admin/audit-logs?page=${pg}`);
      setLogs(d.logs);
      setPages(Math.max(1, Math.ceil(d.total / 30)));
      setPage(pg);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-white">Audit Logs</h2>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead><tr className="text-left uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">IP</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-700/40">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-2.5 text-white font-semibold">{l.actorName || "—"}</td>
                  <td className="px-4 py-2.5"><span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-amber-300">{l.action}</span></td>
                  <td className="px-4 py-2.5 text-slate-400">{l.entityType ? `${l.entityType}:${l.entityId?.slice(0, 8)}` : "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{l.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30">Prev</button>
          <span className="text-xs text-slate-500 leading-9">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page + 1)} className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30">Next</button>
        </div>
      )}
      <p className="text-xs text-slate-500">Also see: <Link href="/admin?tab=settings" className="text-amber-400">Settings</Link></p>
    </div>
  );
}
