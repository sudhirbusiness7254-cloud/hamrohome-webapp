"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNPR } from "@/lib/format";
import { ScrollReveal } from "./ScrollReveal";

type Item = { slug: string; name: string; price: number; mrp: number; imageColor: string; rating: string };

export function RecentlyViewed() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("bz_recent") || "[]"));
    } catch { /* ignore */ }
  }, []);

  if (items.length === 0) return null;

  return (
    <ScrollReveal className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
      <h2 className="text-xl font-black text-white mb-5">Recently Viewed</h2>
      <div className="scroll-row flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`}
            className="product-card flex-shrink-0 w-[180px] rounded-2xl border border-slate-700/50 bg-slate-800/70 p-4">
            <div className="h-24 w-24 mx-auto rounded-2xl" style={{ backgroundColor: p.imageColor }} />
            <p className="mt-3 text-xs font-bold text-white truncate">{p.name}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-sm font-black text-amber-400">{formatNPR(p.price)}</span>
              {p.mrp > p.price && <span className="text-[10px] text-slate-500 line-through">{formatNPR(p.mrp)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
}
