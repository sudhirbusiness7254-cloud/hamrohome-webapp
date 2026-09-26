"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ShopListing } from "@/components/marketplace/ShopListing";
import { api } from "@/lib/client";

function BrandInner({ slug }: { slug: string }) {
  const [brand, setBrand] = useState<{ name: string; description: string | null; color: string; productCount: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ brand: { name: string; description: string | null; color: string; productCount: number } }>(`/api/catalog/brands?slug=${slug}`);
        setBrand(data.brand);
      } catch { /* ignore */ }
    })();
  }, [slug]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-amber-400">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-amber-400">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-300 font-semibold">{brand?.name ?? slug}</span>
        </nav>
        {brand && (
          <div className="mt-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: brand.color }}>
              {brand.name.charAt(0)}
            </div>
            <p className="text-sm text-slate-400 max-w-xl">{brand.description || `Shop all ${brand.name} products on Bazzaro.`}</p>
          </div>
        )}
      </div>
      <ShopListing title={brand?.name ?? "Brand"} subtitle={`${brand?.productCount ?? ""} products`} brand={slug} />
    </>
  );
}

export default function BrandPage() {
  const params = useParams();
  const slug = params.slug as string;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-slate-400">Loading...</div>}>
          <BrandInner slug={slug} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
