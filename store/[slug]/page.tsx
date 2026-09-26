"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Store, Star, Package, BadgeCheck, ShoppingBag } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard, type ProductCardData } from "@/components/marketplace/ProductCard";
import { api, errMsg } from "@/lib/client";
import { formatNPR } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";

type StoreData = {
  vendor: { shopName: string; slug: string; logoColor: string; description: string | null };
  products: ProductCardData[];
  stats: { products: number; sold: number; rating: string };
};

export default function StorePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("popular");

  useEffect(() => {
    (async () => {
      try {
        const d = await api<StoreData>(`/api/catalog/stores?slug=${slug}`);
        setData(d);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const sorted = [...(data?.products ?? [])].sort((a, b) => {
    if (sort === "price_asc") return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
    if (sort === "price_desc") return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
    if (sort === "rating") return Number(b.ratingAvg) - Number(a.ratingAvg);
    return b.soldCount - a.soldCount;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        {loading ? (
          <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
            <Skeleton className="h-44 !bg-slate-800" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-72 !bg-slate-800" /><Skeleton className="h-72 !bg-slate-800" /><Skeleton className="h-72 !bg-slate-800" /><Skeleton className="h-72 !bg-slate-800" /></div>
          </div>
        ) : error || !data ? (
          <div className="mx-auto max-w-3xl px-4 py-20">
            <EmptyState icon={<Store className="h-12 w-12" />} title="Store not found" message={error}
              action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Browse Products</Link>} />
          </div>
        ) : (
          <>
            {/* Store hero */}
            <div className="border-b border-slate-800" style={{ background: `linear-gradient(135deg, ${data.vendor.logoColor}26, transparent 60%)` }}>
              <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <span className="h-20 w-20 rounded-3xl flex items-center justify-center text-white shadow-xl flex-shrink-0" style={{ backgroundColor: data.vendor.logoColor }}>
                    <Store className="h-9 w-9" />
                  </span>
                  <div className="flex-1">
                    <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-2">
                      {data.vendor.shopName}
                      <span className="flex items-center gap-1 text-[10px] font-black rounded-full bg-emerald-500/15 text-emerald-300 px-2.5 py-1"><BadgeCheck className="h-3 w-3" /> VERIFIED</span>
                    </h1>
                    {data.vendor.description && <p className="mt-1 text-sm text-slate-400 max-w-2xl">{data.vendor.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-amber-400" /><b className="text-white">{data.stats.products}</b> products</span>
                      <span className="flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5 text-amber-400" /><b className="text-white">{Number(data.stats.sold).toLocaleString()}</b> sold</span>
                      <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-400" /><b className="text-white">{Number(data.stats.rating).toFixed(1)}</b> avg rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-white">All Products ({data.products.length})</h2>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-sm font-bold text-white focus:border-amber-500 outline-none">
                  <option value="popular">Most Popular</option>
                  <option value="rating">Top Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              {sorted.length === 0 ? (
                <EmptyState title="No products yet" message="This seller has not listed any products." />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sorted.map((p, i) => (
                    <div key={p.id} className="[&>div]:w-full"><ProductCard product={p} index={i} /></div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function storeHelper() {
  return formatNPR(0);
}
