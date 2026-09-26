"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingCart, Flame, Check } from "lucide-react";
import { formatNPR } from "@/lib/format";
import { useCartStore } from "@/lib/store";
import { errMsg } from "@/lib/client";

type FlashProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageColor: string;
  imageUrl?: string | null;
  discountPercent?: number;
  flashPrice?: number;
  stock: number;
  sold: number;
};

export function FlashSale({ products, endsAt }: { products: FlashProduct[]; endsAt: string }) {
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0 });
  const addToCart = useCartStore((s) => s.add);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setRemaining({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const scroll = (dir: number) => {
    const row = document.getElementById("flash-scroll");
    if (row) row.scrollBy({ left: dir * 480, behavior: "smooth" });
  };

  const handleAdd = async (p: FlashProduct) => {
    setErr("");
    try {
      await addToCart(p.id, null, 1);
      setAddedId(p.id);
      setTimeout(() => setAddedId(null), 1500);
    } catch (e) {
      setErr(errMsg(e));
      setTimeout(() => setErr(""), 2500);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl px-4 py-2">
            <Flame className="h-5 w-5 text-white animate-pulse" />
            <span className="text-lg font-black text-white">Flash Sale</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <TimeBlock value={pad(remaining.h)} label="HRS" />
            <span className="text-2xl font-black text-orange-400 mx-0.5">:</span>
            <TimeBlock value={pad(remaining.m)} label="MIN" />
            <span className="text-2xl font-black text-orange-400 mx-0.5">:</span>
            <TimeBlock value={pad(remaining.s)} label="SEC" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/flash-sales" className="hidden sm:block text-sm font-bold text-amber-400 hover:text-amber-300 mr-2">View All</Link>
          <button onClick={() => scroll(-1)} className="h-9 w-9 rounded-full border border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center hover:border-amber-500 hover:text-amber-400 transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="h-9 w-9 rounded-full border border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center hover:border-amber-500 hover:text-amber-400 transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {err && <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{err}</div>}

      <div className="relative">
        <div id="flash-scroll" className="scroll-row flex gap-4 overflow-x-auto pb-2">
          {products.map((p) => {
            const finalPrice = p.flashPrice ?? p.salePrice ?? p.price;
            const discount = p.discountPercent ?? (p.salePrice ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0);
            const progress = Math.min(100, Math.round((p.sold / Math.max(p.stock, 1)) * 100));
            const soldOut = p.stock - p.sold <= 0;
            return (
              <div key={p.id} className="flex-shrink-0 w-[220px] group">
                <div className="product-card relative rounded-2xl border border-slate-700/50 bg-slate-800/80 backdrop-blur overflow-hidden">
                  <div className="absolute top-3 left-3 z-10 h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-[11px] font-black text-white pulse-badge">
                    -{discount}%
                  </div>
                  <Link href={`/products/${p.slug}`} className="block" aria-label={`View ${p.name}`}>
                    <div className="product-image-frame relative h-44 sm:h-48 w-full overflow-hidden">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={p.name} fill sizes="220px" unoptimized={p.imageUrl.startsWith("https://")} className="object-cover group-hover:scale-[1.08] transition-transform duration-500" />
                      ) : (
                        <div className="h-full w-full" style={{ backgroundColor: p.imageColor }} />
                      )}
                    </div>
                  </Link>
                  <div className="p-4 pt-0">
                    <Link href={`/products/${p.slug}`}><h4 className="text-sm font-bold text-white truncate hover:text-amber-400 transition-colors">{p.name}</h4></Link>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-lg font-black text-amber-400">{formatNPR(finalPrice)}</span>
                      {discount > 0 && <span className="text-xs text-slate-500 line-through">{formatNPR(p.price)}</span>}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>{p.sold} sold</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <button onClick={() => handleAdd(p)} disabled={soldOut}
                      className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition-all duration-300 disabled:opacity-40 ${addedId === p.id ? "bg-gradient-to-r from-emerald-500 to-teal-500 opacity-100" : "bg-gradient-to-r from-orange-500 to-red-500 opacity-100 sm:opacity-0 sm:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}`}>
                      {addedId === p.id ? <><Check className="h-3.5 w-3.5" /> Added!</> : <><ShoppingCart className="h-3.5 w-3.5" /> {soldOut ? "Sold Out" : "Add to Cart"}</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-0.5">
        {value.split("").map((d, i) => (
          <div key={`${label}-${i}-${d}`}
            className="countdown-digit h-10 w-8 rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-lg font-black text-white shadow-inner">
            {d}
          </div>
        ))}
      </div>
      <span className="text-[9px] font-bold text-slate-500 mt-1 tracking-wider">{label}</span>
    </div>
  );
}
