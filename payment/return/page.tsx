"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, CheckCircle, ChevronLeft, Loader } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { api, errMsg } from "@/lib/client";
import { formatNPR } from "@/lib/format";

type Txn = {
  txn: string; provider: string; providerName: string; status: string; amount: number;
  gatewayRef: string | null; orderId: string; orderNumber: string; orderStatus: string;
};

function GatewayInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const txnId = sp.get("txn") ?? "";
  const [txn, setTxn] = useState<Txn | null>(null);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState("");
  const [mpin, setMpin] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!txnId) { setError("Transaction not found"); return; }
    (async () => {
      try {
        const d = await api<Txn>(`/api/payments?txn=${txnId}`);
        setTxn(d);
        if (d.status === "verified") {
          router.push(`/checkout/success?order=${d.orderId}`);
        }
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [txnId, router]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^9[678]\d{8}$/.test(wallet.replace(/[\s-]/g, ""))) { setError("Enter a valid wallet number (98XXXXXXXX)"); return; }
    if (!/^\d{4}$/.test(mpin)) { setError("Enter your 4-digit MPIN"); return; }
    setPaying(true);
    try {
      const r = await api<{ orderId: string }>(`/api/payments`, { method: "POST", body: { op: "complete", txnId, wallet } });
      setDone(true);
      setTimeout(() => router.push(`/checkout/success?order=${r.orderId}`), 1200);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setPaying(false);
    }
  };

  const color = txn?.provider === "khalti" ? "#5c2d91" : "#60bb46";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {!txn && !error && (
        <div className="text-center py-16"><Loader className="h-8 w-8 text-amber-400 animate-spin mx-auto" /><p className="mt-3 text-sm text-slate-400">Loading secure payment...</p></div>
      )}
      {error && !txn && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <p className="font-bold text-rose-300">{error}</p>
          <Link href="/account?tab=orders" className="mt-4 inline-block text-sm font-bold text-amber-400">Go to My Orders</Link>
        </div>
      )}
      {txn && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 overflow-hidden scale-pop">
          {/* Provider header */}
          <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
            <div className="h-14 w-14 mx-auto rounded-2xl bg-white/95 flex items-center justify-center text-lg font-black" style={{ color }}>
              {txn.provider === "khalti" ? "K" : "eS"}
            </div>
            <h1 className="mt-3 text-xl font-black text-white">{txn.providerName} Secure Payment</h1>
            <p className="mt-1 text-xs text-white/80 flex items-center justify-center gap-1"><Lock className="h-3 w-3" /> 256-bit encrypted • Verified by Bazzaro</p>
          </div>

          <div className="p-6">
            <div className="rounded-xl bg-slate-900/70 border border-slate-700/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Paying to Bazzaro</p>
                <p className="text-xs text-slate-500">Order {txn.orderNumber}</p>
              </div>
              <p className="text-2xl font-black text-white">{formatNPR(txn.amount)}</p>
            </div>

            {done ? (
              <div className="mt-6 text-center py-6">
                <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
                <p className="mt-3 font-black text-white">Payment Successful!</p>
                <p className="text-xs text-slate-400 mt-1">Verifying and confirming your order...</p>
              </div>
            ) : (
              <form onSubmit={pay} className="mt-5 space-y-4">
                {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300">{error}</div>}
                <div>
                  <label className="text-xs font-bold text-slate-400">{txn.providerName} Mobile Number</label>
                  <input value={wallet} onChange={(e) => setWallet(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} placeholder="98XXXXXXXX" inputMode="numeric"
                    className="mt-1 w-full h-12 rounded-xl bg-slate-900 border border-slate-700 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none" style={{ caretColor: color }} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">MPIN</label>
                  <input type="password" value={mpin} onChange={(e) => setMpin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))} placeholder="••••" inputMode="numeric"
                    className="mt-1 w-full h-12 rounded-xl bg-slate-900 border border-slate-700 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none tracking-[0.5em] text-center" />
                </div>
                <button disabled={paying} className="w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                  {paying ? "Processing securely..." : `Pay ${formatNPR(txn.amount)}`}
                </button>
                <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sandbox gateway — payment is verified server-side with signed callbacks
                </p>
                <button type="button" onClick={() => router.push(`/account?tab=orders&order=${txn.orderId}`)} className="w-full flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-white">
                  <ChevronLeft className="h-3.5 w-3.5" /> Cancel and return to order
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
          <GatewayInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
