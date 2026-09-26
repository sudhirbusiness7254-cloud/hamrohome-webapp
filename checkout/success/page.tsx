"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, ArrowRight, Loader } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate, ORDER_STATUS_META, PAYMENT_METHOD_LABEL } from "@/lib/format";

type OrderDetail = {
  order: {
    id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
    subtotal: number; discountTotal: number; taxTotal: number; deliveryFee: number; grandTotal: number;
    estimatedDelivery: string | null; createdAt: string;
    addressSnapshot: { recipient: string; phone: string; street: string; city: string; district: string };
  };
  items: { item: { nameSnapshot: string; quantity: number; unitPrice: number; subtotal: number; imageColor: string | null; imageUrl: string | null } }[];
};

function SuccessInner() {
  const sp = useSearchParams();
  const orderId = sp.get("order") ?? "";
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) { setError("Order not found"); return; }
    (async () => {
      try {
        const d = await api<OrderDetail>(`/api/orders?id=${orderId}`);
        setData(d);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [orderId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {!data && !error && (
        <div className="text-center py-16"><Loader className="h-8 w-8 text-amber-400 animate-spin mx-auto" /><p className="mt-3 text-sm text-slate-400">Loading your order...</p></div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <p className="font-bold text-rose-300">{error}</p>
          <Link href="/account?tab=orders" className="mt-4 inline-block text-sm font-bold text-amber-400">Go to My Orders</Link>
        </div>
      )}
      {data && (
        <>
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-8 text-center scale-pop">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
            <h1 className="mt-4 text-2xl lg:text-3xl font-black text-white">Order Placed Successfully!</h1>
            <p className="mt-2 text-sm text-slate-400">
              {data.order.paymentMethod === "cod"
                ? "Pay in cash when your order arrives at your door."
                : data.order.paymentStatus === "verified"
                  ? `Payment of ${formatNPR(data.order.grandTotal)} verified. Thank you!`
                  : "Complete your payment to confirm this order."}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-5 py-2.5">
              <Package className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-black text-white tracking-wide">{data.order.orderNumber}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <span className="font-bold" style={{ color: ORDER_STATUS_META[data.order.status]?.color }}>{ORDER_STATUS_META[data.order.status]?.label}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{PAYMENT_METHOD_LABEL[data.order.paymentMethod]}</span>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
              <h3 className="text-sm font-black text-white mb-3">Items ({data.items.length})</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {data.items.map((x, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700">{x.item.imageUrl ? <img src={x.item.imageUrl} alt={x.item.nameSnapshot} className="h-full w-full object-cover" /> : <span className="h-full w-full block" style={{ backgroundColor: x.item.imageColor || "#64748b" }} />}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{x.item.nameSnapshot}</p>
                      <p className="text-[11px] text-slate-500">Qty {x.item.quantity}</p>
                    </div>
                    <p className="text-xs font-black text-white">{formatNPR(x.item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
              <h3 className="text-sm font-black text-white mb-3">Delivery Details</h3>
              <p className="text-sm text-slate-300">{data.order.addressSnapshot.recipient}</p>
              <p className="text-xs text-slate-500">{data.order.addressSnapshot.phone}</p>
              <p className="mt-1 text-xs text-slate-400">{data.order.addressSnapshot.street}, {data.order.addressSnapshot.city}, {data.order.addressSnapshot.district}</p>
              <div className="mt-4 space-y-1.5 text-xs border-t border-slate-700/50 pt-3">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-200 font-bold">{formatNPR(data.order.subtotal)}</span></div>
                {data.order.discountTotal > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-emerald-400 font-bold">-{formatNPR(data.order.discountTotal)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="text-slate-200 font-bold">{data.order.deliveryFee === 0 ? "FREE" : formatNPR(data.order.deliveryFee)}</span></div>
                <div className="flex justify-between pt-1"><span className="text-slate-300 font-bold">Total</span><span className="text-amber-400 font-black">{formatNPR(data.order.grandTotal)}</span></div>
              </div>
              {data.order.estimatedDelivery && <p className="mt-3 text-xs text-slate-400">Estimated delivery: <b className="text-white">{formatDate(data.order.estimatedDelivery)}</b></p>}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/account?tab=orders&order=${data.order.id}`} className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white flex items-center justify-center gap-2">
              Track Your Order <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/products" className="h-12 px-8 rounded-xl border border-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-center">
              Continue Shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
          <SuccessInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
