"use client";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { FlashSale } from "@/components/marketplace/FlashSale";
import { api, errMsg } from "@/lib/client";
import { Skeleton, EmptyState } from "@/components/ui";

type Sale = {
  id: string; name: string; description: string | null; endsAt: string;
  products: {
    id: string; name: string; slug: string; price: number; salePrice: number | null;
    imageColor: string; discountPercent: number; flashPrice: number; stockLimit: number; sold: number;
  }[];
};

export default function FlashSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ sales: Sale[] }>("/api/flash-sales");
        setSales(data.sales);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="pb-10">
        <div className="bg-gradient-to-r from-orange-600/20 via-red-600/10 to-orange-600/20 border-b border-orange-500/20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-xs font-black text-white pulse-badge">
              <Flame className="h-3.5 w-3.5" /> LIMITED TIME
            </span>
            <h1 className="mt-3 text-3xl lg:text-4xl font-black text-white">Flash Sales</h1>
            <p className="mt-2 text-sm text-slate-400">Huge discounts, limited stock. When the timer ends, prices go back up.</p>
          </div>
        </div>
        {loading ? (
          <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
            <Skeleton className="h-12 w-64 !bg-slate-800" />
            <div className="flex gap-4"><Skeleton className="h-72 w-56 !bg-slate-800" /><Skeleton className="h-72 w-56 !bg-slate-800" /><Skeleton className="h-72 w-56 !bg-slate-800" /></div>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Could not load flash sales" message={error} /></div>
        ) : sales.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-16">
            <EmptyState icon={<Flame className="h-12 w-12" />} title="No live flash sales" message="Check back soon — new lightning deals drop every week." />
          </div>
        ) : (
          sales.map((s) => (
            <div key={s.id}>
              <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-8">
                <h2 className="text-xl font-black text-white">{s.name}</h2>
                {s.description && <p className="text-sm text-slate-400 mt-0.5">{s.description}</p>}
              </div>
              <FlashSale
                endsAt={s.endsAt}
                products={s.products.map((p) => ({ ...p, imageColor: p.imageColor, stock: p.stockLimit }))}
              />
            </div>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}
