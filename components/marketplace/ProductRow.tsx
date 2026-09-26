"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { ProductCard, type ProductCardData } from "./ProductCard";
import Link from "next/link";

export function ProductRow({
  title,
  subtitle,
  viewAllHref,
  products,
}: {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  products: ProductCardData[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollBy({ left: dir * 480, behavior: "smooth" });
      setTimeout(checkScroll, 400);
    }
  };

  if (products.length === 0) return null;

  return (
    <ScrollReveal className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll(-1)}
              disabled={!canLeft}
              className="h-8 w-8 rounded-full border border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-400 transition-all"
            >
              <ChevronLeft className="h-4 w-4"/>
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canRight}
              className="h-8 w-8 rounded-full border border-slate-700 bg-slate-800 text-slate-400 flex items-center justify-center hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-400 transition-all"
            >
              <ChevronRight className="h-4 w-4"/>
            </button>
          </div>
          <Link
            href={viewAllHref}
            className="flex items-center gap-1.5 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scroll-row flex gap-4 overflow-x-auto pb-2"
      >
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i}/>
        ))}
      </div>
    </ScrollReveal>
  );
}
