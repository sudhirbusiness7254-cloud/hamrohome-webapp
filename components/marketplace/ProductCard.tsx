"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, Check, Package } from "lucide-react";
import { formatNPR } from "@/lib/format";
import { Stars } from "@/components/ui";
import { useCartStore, useWishlistStore, useAuthStore } from "@/lib/store";
import { errMsg } from "@/lib/client";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageColor: string;
  imageUrl?: string | null;
  ratingAvg: string;
  reviewCount: number;
  soldCount: number;
  brand?: { name: string } | null;
  badge?: string;
  flashPrice?: number | null;
  flashDiscount?: number | null;
  available?: number;
};

export function ProductCard({ product, index = 0 }: { product: ProductCardData; index?: number }) {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.add);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const hasWish = useWishlistStore((s) => s.has);
  const user = useAuthStore((s) => s.user);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const finalPrice = product.flashPrice ?? product.salePrice ?? product.price;
  const hasDiscount = finalPrice < product.price;
  const discount = hasDiscount ? Math.round(((product.price - finalPrice) / product.price) * 100) : 0;
  const wished = hasWish(product.id);
  const outOfStock = product.available !== undefined && product.available <= 0;

  const handleAdd = async () => {
    setError("");
    setAdding(true);
    try {
      await addToCart(product.id, null, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (e) {
      setError(errMsg(e));
      setTimeout(() => setError(""), 2500);
    } finally {
      setAdding(false);
    }
  };

  const handleWish = async () => {
    if (!user) { router.push(`/login?next=/products/${product.slug}`); return; }
    try { await toggleWish(product.id); } catch { /* ignore */ }
  };

  return (
    <div className="product-card flex-shrink-0 w-[200px] sm:w-[220px] group" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="relative rounded-2xl border border-slate-700/50 bg-slate-800/70 backdrop-blur overflow-hidden h-full flex flex-col">
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="h-7 px-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-[10px] font-black text-white flex items-center shadow">-{discount}%</span>
          )}
          {product.flashPrice && (
            <span className="h-7 px-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-black text-white flex items-center shadow pulse-badge">FLASH</span>
          )}
          {product.badge && (
            <span className="h-7 px-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-[10px] font-black text-white flex items-center shadow">{product.badge}</span>
          )}
        </div>

        <button onClick={handleWish} aria-label="Toggle wishlist"
          className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-lg backdrop-blur border flex items-center justify-center transition-all ${wished ? "bg-rose-500/20 border-rose-400 text-rose-400" : "bg-slate-900/80 border-slate-600 text-slate-400 hover:text-rose-400 hover:border-rose-400"}`}>
          <Heart className={`h-3.5 w-3.5 ${wished ? "fill-current" : ""}`} />
        </button>

        <Link href={`/products/${product.slug}`} className="block" aria-label={`View ${product.name}`}>
          <div className="product-image-frame relative h-44 sm:h-48 w-full overflow-hidden cursor-pointer">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.name} fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                unoptimized={product.imageUrl.startsWith("https://")}
                className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: product.imageColor }}><Package className="h-12 w-12 text-white/40" /></div>
            )}
          </div>
        </Link>

        <div className="p-4 pt-2 border-t border-slate-700/50 flex-1 flex flex-col">
          {product.brand && <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">{product.brand.name}</p>}
          <Link href={`/products/${product.slug}`}>
            <h4 className="text-sm font-bold text-white truncate hover:text-amber-400 transition-colors cursor-pointer">{product.name}</h4>
          </Link>
          <div className="mt-1.5 flex items-center">
            <Stars value={Number(product.ratingAvg)} size={12} />
            <span className="text-[10px] text-slate-500 ml-1">({product.reviewCount})</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black text-amber-400">{formatNPR(finalPrice)}</span>
            {hasDiscount && <span className="text-xs text-slate-500 line-through">{formatNPR(product.price)}</span>}
          </div>
          {product.soldCount > 0 && <p className="text-[10px] text-slate-500 mt-1">{product.soldCount.toLocaleString()} sold</p>}
          {outOfStock && <p className="text-[11px] font-bold text-rose-400 mt-1">Out of stock</p>}
          {error && <p className="text-[11px] font-bold text-rose-400 mt-1 truncate">{error}</p>}

          <div className="mt-auto pt-3">
            <button onClick={handleAdd} disabled={adding || outOfStock}
              className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 ${added ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-slate-700 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500"}`}>
              {added ? <><Check className="h-3.5 w-3.5" /> Added!</> : <><ShoppingCart className="h-3.5 w-3.5" /> {adding ? "Adding..." : "Add to Cart"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
