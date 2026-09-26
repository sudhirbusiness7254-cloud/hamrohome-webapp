"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ShopListing } from "@/components/marketplace/ShopListing";
import { api } from "@/lib/client";

type Cat = { name: string; slug: string; description: string | null; productCount: number };

function CategoryInner({ slug }: { slug: string }) {
  const [cat, setCat] = useState<Cat | null>(null);
  const [children, setChildren] = useState<Cat[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ category: Cat; children: Cat[] }>(`/api/catalog/categories?slug=${slug}`);
        setCat(data.category);
        setChildren(data.children);
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
          <span className="text-slate-300 font-semibold">{cat?.name ?? slug}</span>
        </nav>
        {children.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {children.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}
                className="text-xs font-bold rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-all">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      <ShopListing
        title={cat?.name ?? "Category"}
        subtitle={cat?.description ?? `${cat?.productCount ?? ""} products`}
        category={slug}
      />
    </>
  );
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-slate-400">Loading...</div>}>
          <CategoryInner slug={slug} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
