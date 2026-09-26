"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard, type ProductCardData } from "@/components/marketplace/ProductCard";
import { api } from "@/lib/client";
import { useAuthStore } from "@/lib/store";
import { Skeleton, EmptyState } from "@/components/ui";

export default function WishlistPage() {
  const { user, loaded } = useAuthStore();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const data = await api<{ items: ProductCardData[] }>("/api/wishlist");
        setItems(data.items);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [loaded, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Heart className="h-6 w-6 text-rose-400" /> My Wishlist
        </h1>
        {loading ? (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 !bg-slate-800" />)}
          </div>
        ) : !user ? (
          <div className="mt-8">
            <EmptyState title="Sign in to view your wishlist" message="Your saved items are waiting for you."
              action={<Link href="/login?next=/wishlist" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Sign In</Link>} />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={<Heart className="h-12 w-12" />} title="Your wishlist is empty"
              message="Tap the heart icon on any product to save it here."
              action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Discover Products</Link>} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((p, i) => (
              <div key={p.id} className="[&>div]:w-full"><ProductCard product={p} index={i} /></div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
