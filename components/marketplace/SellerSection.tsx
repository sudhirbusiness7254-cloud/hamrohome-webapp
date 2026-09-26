"use client";
import { ScrollReveal } from "./ScrollReveal";
import { Store, Star, Package } from "lucide-react";
import Link from "next/link";

type Seller = {
  userId: string;
  shopName: string;
  slug: string;
  logoColor: string;
  description: string | null;
  productCount?: number;
};

export function SellerSection({ sellers }: { sellers: Seller[] }) {
  return (
    <ScrollReveal stagger className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-white">
          Local <span className="gradient-text">Nepal Sellers</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">Shop direct from verified vendors across Nepal</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {sellers.map((s) => (
          <Link
            key={s.userId}
            href={`/store/${s.slug}`}
            className="product-card group rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 text-center hover:bg-slate-700/50 transition-all"
          >
            <div
              className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg"
              style={{ backgroundColor: s.logoColor }}
            >
              <Store className="h-7 w-7"/>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              {s.shopName}
            </h4>
            {s.description && (
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{s.description}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><Package className="h-3 w-3"/> {s.productCount ?? 0} products</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400"/> 4.8</span>
            </div>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
}
