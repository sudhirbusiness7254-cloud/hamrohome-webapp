"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { ProductCard, type ProductCardData } from "./ProductCard";
import { ScrollReveal } from "./ScrollReveal";
import { Skeleton, EmptyState } from "@/components/ui";

type Facet = { name: string; slug: string; productCount?: number };

const SORTS = [
  { v: "newest", l: "Newest" },
  { v: "bestselling", l: "Best Selling" },
  { v: "rating", l: "Top Rated" },
  { v: "price_asc", l: "Price: Low to High" },
  { v: "price_desc", l: "Price: High to Low" },
  { v: "discount", l: "Biggest Discount" },
];

export function ShopListing({
  title, subtitle, category, brand, vendor, initialQuery,
}: {
  title: string; subtitle?: string; category?: string; brand?: string; vendor?: string; initialQuery?: string;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cats, setCats] = useState<Facet[]>([]);
  const [brands, setBrands] = useState<Facet[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [q, setQ] = useState(initialQuery ?? sp.get("q") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "newest");
  const [page, setPage] = useState(Number(sp.get("page") ?? 1));
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  const [selBrand, setSelBrand] = useState(sp.get("brand") ?? "");
  const [selCat, setSelCat] = useState(category ?? sp.get("category") ?? "");
  const [rating, setRating] = useState(sp.get("rating") ?? "");
  const featured = sp.get("featured") === "true";

  // sync query string param q
  useEffect(() => {
    const nq = initialQuery ?? sp.get("q") ?? "";
    setQ((old) => (old === nq ? old : nq));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, initialQuery]);

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          api<{ categories: Facet[] }>("/api/catalog/categories"),
          api<{ brands: Facet[] }>("/api/catalog/brands"),
        ]);
        setCats(c.categories.filter((x) => !x.slug.includes("-") || true));
        setBrands(b.brands);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (selCat) params.set("category", selCat);
      if (brand || selBrand) params.set("brand", brand || selBrand);
      if (vendor) params.set("vendor", vendor);
      if (min) params.set("min", min);
      if (max) params.set("max", max);
      if (rating) params.set("rating", rating);
      if (sort) params.set("sort", sort);
      if (featured) params.set("featured", "true");
      params.set("page", String(page));
      params.set("limit", "12");
      const data = await api<{ items: ProductCardData[]; total: number; pages: number }>(`/api/products?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, selCat, brand, selBrand, vendor, min, max, rating, sort, featured, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // keep URL in sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (!category && selCat) params.set("category", selCat);
    if (!brand && selBrand) params.set("brand", selBrand);
    if (min) params.set("min", min);
    if (max) params.set("max", max);
    if (rating) params.set("rating", rating);
    if (sort !== "newest") params.set("sort", sort);
    if (featured) params.set("featured", "true");
    if (page > 1) params.set("page", String(page));
    const s = params.toString();
    router.replace(s ? `?${s}` : "?", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selCat, selBrand, min, max, rating, sort, page]);

  const resetPage = () => setPage(1);

  const filterPanel = (
    <div className="space-y-6">
      {!category && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Category</h4>
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            <FilterRadio name="cat" label="All Categories" checked={!selCat} onClick={() => { setSelCat(""); resetPage(); }} />
            {cats.filter((c) => (c.productCount ?? 0) >= 0).slice(0, 20).map((c) => (
              <FilterRadio key={c.slug} name="cat" label={c.name} checked={selCat === c.slug} onClick={() => { setSelCat(c.slug); resetPage(); }} />
            ))}
          </div>
        </div>
      )}
      {!brand && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Brand</h4>
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            <FilterRadio name="brand" label="All Brands" checked={!selBrand} onClick={() => { setSelBrand(""); resetPage(); }} />
            {brands.map((b) => (
              <FilterRadio key={b.slug} name="brand" label={b.name} checked={selBrand === b.slug} onClick={() => { setSelBrand(b.slug); resetPage(); }} />
            ))}
          </div>
        </div>
      )}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Price (Rs.)</h4>
        <div className="flex gap-2">
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={resetPage} placeholder="Min"
            className="w-full h-10 rounded-lg bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={resetPage} placeholder="Max"
            className="w-full h-10 rounded-lg bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
        </div>
        {[
          { l: "Under Rs. 1,000", min: "", max: "1000" },
          { l: "Rs. 1,000 – 5,000", min: "1000", max: "5000" },
          { l: "Rs. 5,000 – 25,000", min: "5000", max: "25000" },
          { l: "Above Rs. 25,000", min: "25000", max: "" },
        ].map((r) => (
          <button key={r.l} onClick={() => { setMin(r.min); setMax(r.max); resetPage(); }}
            className="block w-full text-left text-xs text-slate-400 hover:text-amber-400 py-1 transition-colors">{r.l}</button>
        ))}
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Rating</h4>
        {["", "4", "3"].map((r) => (
          <FilterRadio key={r} name="rating" label={r === "" ? "Any rating" : `${r} stars & up`} checked={rating === r} onClick={() => { setRating(r); resetPage(); }} />
        ))}
      </div>
      <button
        onClick={() => { setSelCat(category ?? ""); setSelBrand(""); setMin(""); setMax(""); setRating(""); setQ(""); setSort("newest"); resetPage(); }}
        className="text-xs font-bold text-slate-400 hover:text-white underline underline-offset-2"
      >
        Clear all filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
      <ScrollReveal>
        <h1 className="text-2xl lg:text-3xl font-black text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        {q && <p className="text-sm text-slate-300 mt-2">Results for <span className="font-bold text-amber-400">&ldquo;{q}&rdquo;</span> <button onClick={() => { setQ(""); resetPage(); }} className="ml-1 text-xs underline text-slate-400">clear</button></p>}
      </ScrollReveal>

      <div className="mt-6 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="sticky top-36 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">{filterPanel}</div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen(true)} className="lg:hidden flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-700 bg-slate-800 text-sm font-bold text-white">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
              <p className="text-sm text-slate-400">{loading ? "Loading..." : `${total} product${total === 1 ? "" : "s"}`}</p>
            </div>
            <select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }}
              className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-sm font-bold text-white focus:border-amber-500 outline-none">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>

          {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 !bg-slate-800" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={<SearchX className="h-12 w-12" />} title="No products found" message="Try adjusting your filters or search term." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((p, i) => (
                <div key={p.id} className="[&>div]:w-full">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:border-amber-500 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
                const pg = i + 1;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`h-10 min-w-10 px-2 rounded-xl text-sm font-bold transition-all ${pg === page ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500"}`}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}
                className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 hover:border-amber-500 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-slate-950/90" onClick={() => setFiltersOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-slate-900 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className="font-black text-white">Filters</span>
              <button onClick={() => setFiltersOpen(false)}><X className="h-5 w-5 text-white" /></button>
            </div>
            {filterPanel}
            <button onClick={() => setFiltersOpen(false)} className="mt-6 w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Show {total} results</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRadio({ label, checked, onClick }: { name: string; label: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 w-full text-left py-1 group">
      <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "border-amber-400" : "border-slate-600 group-hover:border-slate-400"}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-amber-400" />}
      </span>
      <span className={`text-sm transition-colors ${checked ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"}`}>{label}</span>
    </button>
  );
}
