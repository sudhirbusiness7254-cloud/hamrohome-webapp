"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ShoppingCart, Heart, Minus, Plus, Truck, ShieldCheck,
  RotateCcw, Star, Check, Store, Zap, ThumbsUp, BadgeCheck,
} from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard, type ProductCardData } from "@/components/marketplace/ProductCard";
import { Stars, Skeleton, EmptyState } from "@/components/ui";
import { api, errMsg } from "@/lib/client";
import { formatNPR, formatDate } from "@/lib/format";
import { useCartStore, useWishlistStore, useAuthStore } from "@/lib/store";

type Variant = {
  id: string; name: string; color: string | null; size: string | null; sku: string;
  price: number | null; stock: number; available: number; imageColor: string | null;
};
type Review = {
  id: string; rating: number; title: string | null; comment: string | null;
  verifiedPurchase: boolean; vendorReply: string | null; helpfulCount: number;
  createdAt: string; userName: string;
};
type Detail = {
  product: {
    id: string; name: string; slug: string; sku: string; price: number; salePrice: number | null;
    shortDescription: string | null; description: string | null; stock: number; reservedStock: number;
    warranty: string | null; returnPolicy: string | null; tags: string[]; ratingAvg: string;
    reviewCount: number; soldCount: number; viewCount: number;
  };
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  vendor: { shopName: string; slug: string; logoColor: string; description: string | null } | null;
  variants: Variant[];
  images: { url: string; alt: string | null }[];
  videos: { url: string; title: string | null }[];
  reviews: { items: Review[]; breakdown: { rating: number; count: number }[] };
  related: ProductCardData[];
  flash: { discount: number; remaining: number } | null;
  canReview: boolean;
  myReview: { id: string; rating: number; title: string | null; comment: string | null } | null;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.add);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const hasWish = useWishlistStore((s) => s.has);

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<"desc" | "reviews" | "shipping">("desc");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [actionErr, setActionErr] = useState("");
  // review form
  const [rRating, setRRating] = useState(5);
  const [rTitle, setRTitle] = useState("");
  const [rComment, setRComment] = useState("");
  const [rSaving, setRSaving] = useState(false);
  const [rMsg, setRMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await api<Detail>(`/api/products/${slug}`);
        setData(d);
        const colors = [...new Set(d.variants.map((v) => v.color).filter(Boolean))] as string[];
        if (colors.length > 0) setColor(colors[0]);
        // recently viewed
        try {
          const rv = JSON.parse(localStorage.getItem("bz_recent") || "[]");
          const first = d.variants[0];
          const entry = { slug: d.product.slug, name: d.product.name, price: d.product.salePrice ?? d.product.price, mrp: d.product.price, imageColor: first?.imageColor || "#94a3b8", rating: d.product.ratingAvg };
          localStorage.setItem("bz_recent", JSON.stringify([entry, ...rv.filter((x: { slug: string }) => x.slug !== slug)].slice(0, 10)));
        } catch { /* ignore */ }
      } catch (e) {
        setError(errMsg(e, "Product not found"));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (data?.myReview) {
      setRRating(data.myReview.rating);
      setRTitle(data.myReview.title || "");
      setRComment(data.myReview.comment || "");
    }
  }, [data?.myReview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950"><Header />
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10 grid lg:grid-cols-2 gap-10">
          <Skeleton className="h-[420px] !bg-slate-800" />
          <div className="space-y-4"><Skeleton className="h-10 w-3/4 !bg-slate-800" /><Skeleton className="h-6 w-1/3 !bg-slate-800" /><Skeleton className="h-32 !bg-slate-800" /></div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950"><Header />
        <div className="mx-auto max-w-3xl px-4 py-20">
          <EmptyState title="Product not found" message={error || "This product may have been removed."} action={<Link href="/products" className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Browse Products</Link>} />
        </div><Footer />
      </div>
    );
  }

  const { product: p, variants } = data;
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];
  const sizesForColor = [...new Set(variants.filter((v) => !color || v.color === color).map((v) => v.size).filter(Boolean))] as string[];
  const selected: Variant | null =
    variants.find((v) => (color ? v.color === color : true) && (size ? v.size === size : true)) ??
    variants.find((v) => (color ? v.color === color : true)) ?? variants[0] ?? null;

  const base = selected?.price ?? p.salePrice ?? p.price;
  const flashPrice = data.flash ? Math.round((base * (100 - data.flash.discount)) / 100) : null;
  const finalPrice = flashPrice ?? base;
  const discount = Math.round(((p.price - finalPrice) / p.price) * 100);
  const maxQty = selected ? Math.max(0, selected.available) : Math.max(0, p.stock - p.reservedStock);

  const doAdd = async (goCheckout: boolean) => {
    setActionErr("");
    if (maxQty <= 0) { setActionErr("This item is out of stock"); return; }
    if (qty > maxQty) { setActionErr(`Only ${maxQty} available`); return; }
    setAdding(true);
    try {
      await addToCart(p.id, selected?.id ?? null, qty);
      if (goCheckout) router.push("/checkout");
      else { setAdded(true); setTimeout(() => setAdded(false), 1600); }
    } catch (e) {
      setActionErr(errMsg(e));
    } finally {
      setAdding(false);
    }
  };

  const doWish = async () => {
    if (!user) { router.push(`/login?next=/products/${slug}`); return; }
    try { await toggleWish(p.id); } catch { /* ignore */ }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setRMsg("");
    setRSaving(true);
    try {
      await api("/api/reviews", { method: "POST", body: { productId: p.id, rating: rRating, title: rTitle, comment: rComment } });
      setRMsg("Thank you! Your review has been submitted.");
      const d = await api<Detail>(`/api/products/${slug}`);
      setData(d);
    } catch (err) {
      setRMsg(errMsg(err));
    } finally {
      setRSaving(false);
    }
  };

  const helpful = async (id: string) => {
    try {
      await api("/api/reviews", { method: "POST", body: { op: "helpful", id } });
      setData({ ...data, reviews: { ...data.reviews, items: data.reviews.items.map((r) => (r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)) } });
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-amber-400">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {data.category && <><Link href={`/category/${data.category.slug}`} className="hover:text-amber-400">{data.category.name}</Link><ChevronRight className="h-3 w-3" /></>}
          <span className="text-slate-300 font-semibold truncate max-w-[300px]">{p.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div>
            <div className="product-image-frame relative rounded-2xl border border-slate-700/50 h-[340px] sm:h-[460px] overflow-hidden">
              {data.flash && (
                <span className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-black text-white pulse-badge">
                  <Zap className="h-3.5 w-3.5" /> FLASH -{data.flash.discount}% ({data.flash.remaining} left)
                </span>
              )}
              {discount > 0 && !data.flash && (
                <span className="absolute top-4 left-4 z-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-black text-white">-{discount}%</span>
              )}
              {data.images[activeImage] ? (
                <img src={data.images[activeImage].url} alt={data.images[activeImage].alt || p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><div className="h-52 w-52 sm:h-64 sm:w-64 rounded-3xl shadow-2xl" style={{ backgroundColor: selected?.imageColor || "#94a3b8" }} /></div>
              )}
            </div>
            {data.images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto scroll-row">
                {data.images.map((img, i) => (
                  <button key={img.url} onClick={() => setActiveImage(i)} aria-label={`View image ${i + 1}`}
                    className={`relative h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? "border-amber-400" : "border-slate-700 hover:border-slate-500"}`}>
                    <img src={img.url} alt={img.alt || `${p.name} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {data.videos.length > 0 && (
              <div className="mt-3 space-y-2">
                {data.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-amber-400 hover:underline">
                    <span className="h-6 w-10 rounded bg-slate-700 flex items-center justify-center text-[10px] font-bold">▶</span> {v.title || `Product video ${i + 1}`}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-center">
                <Truck className="h-5 w-5 text-amber-400 mx-auto" />
                <p className="text-[11px] font-bold text-slate-300 mt-1">Fast Delivery</p>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-center">
                <ShieldCheck className="h-5 w-5 text-emerald-400 mx-auto" />
                <p className="text-[11px] font-bold text-slate-300 mt-1">{p.warranty ? `${p.warranty} Warranty` : "Genuine Product"}</p>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-center">
                <RotateCcw className="h-5 w-5 text-sky-400 mx-auto" />
                <p className="text-[11px] font-bold text-slate-300 mt-1">{p.returnPolicy || "Easy Returns"}</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            {data.brand && (
              <Link href={`/brand/${data.brand.slug}`} className="text-xs font-bold text-amber-400 uppercase tracking-wider hover:underline">{data.brand.name}</Link>
            )}
            <h1 className="mt-1 text-2xl lg:text-3xl font-black text-white leading-tight">{p.name}</h1>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <Stars value={Number(p.ratingAvg)} size={16} />
              <span className="text-sm font-bold text-white">{Number(p.ratingAvg).toFixed(1)}</span>
              <button onClick={() => setTab("reviews")} className="text-sm text-slate-400 hover:text-amber-400">{p.reviewCount} ratings</button>
              <span className="text-slate-600">|</span>
              <span className="text-sm text-slate-400">{p.soldCount.toLocaleString()} sold</span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-amber-400">{formatNPR(finalPrice)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-lg text-slate-500 line-through">{formatNPR(p.price)}</span>
                    <span className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-xs font-black text-white">-{discount}%</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">SKU: {selected?.sku ?? p.sku} {maxQty > 0 ? <span className="text-emerald-400 font-bold ml-2">{maxQty} in stock</span> : <span className="text-rose-400 font-bold ml-2">Out of stock</span>}</p>

              {colors.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400 mb-2">Color: <span className="text-white">{color}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((c) => {
                      const v = variants.find((x) => x.color === c);
                      return (
                        <button key={c} onClick={() => { setColor(c); setSize(null); }}
                          className={`h-10 min-w-10 px-3 rounded-xl border-2 text-xs font-bold transition-all ${color === c ? "border-amber-400 bg-amber-500/10 text-white" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                          <span className="inline-block h-3 w-3 rounded-full mr-1.5 align-middle" style={{ backgroundColor: v?.imageColor || "#94a3b8" }} />{c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {sizesForColor.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400 mb-2">Size: <span className="text-white">{size || "Select"}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {sizesForColor.map((s) => (
                      <button key={s} onClick={() => setSize(s)}
                        className={`h-10 min-w-12 px-4 rounded-xl border-2 text-sm font-bold transition-all ${size === s ? "border-amber-400 bg-amber-500/10 text-white" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-slate-700 overflow-hidden">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-10 flex items-center justify-center text-slate-300 hover:bg-slate-700"><Minus className="h-4 w-4" /></button>
                  <span className="w-10 text-center text-sm font-black text-white">{qty}</span>
                  <button onClick={() => setQty(Math.min(99, qty + 1))} className="h-11 w-10 flex items-center justify-center text-slate-300 hover:bg-slate-700"><Plus className="h-4 w-4" /></button>
                </div>
                <button onClick={doWish} className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all ${hasWish(p.id) ? "border-rose-400 bg-rose-500/10 text-rose-400" : "border-slate-700 text-slate-400 hover:border-rose-400 hover:text-rose-400"}`}>
                  <Heart className={`h-5 w-5 ${hasWish(p.id) ? "fill-current" : ""}`} />
                </button>
              </div>

              {actionErr && <p className="mt-3 text-sm font-bold text-rose-400">{actionErr}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => doAdd(false)} disabled={adding || maxQty <= 0}
                  className="h-12 rounded-xl border-2 border-amber-500 text-sm font-bold text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {added ? <><Check className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> {adding ? "Adding..." : "Add to Cart"}</>}
                </button>
                <button onClick={() => doAdd(true)} disabled={adding || maxQty <= 0}
                  className="h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-40">
                  Buy Now
                </button>
              </div>
            </div>

            {data.vendor && (
              <Link href={`/store/${data.vendor.slug}`} className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 hover:border-amber-500/40 transition-all">
                <span className="h-11 w-11 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: data.vendor.logoColor }}>
                  <Store className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{data.vendor.shopName}</span>
                  <span className="block text-xs text-slate-500">Verified Seller — Visit Store</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10">
          <div className="flex gap-1 border-b border-slate-800">
            {(["desc", "reviews", "shipping"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-bold transition-all relative ${tab === t ? "text-amber-400" : "text-slate-500 hover:text-slate-300"}`}>
                {t === "desc" ? "Description" : t === "reviews" ? `Reviews (${p.reviewCount})` : "Shipping & Returns"}
                {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded" />}
              </button>
            ))}
          </div>

          {tab === "desc" && (
            <div className="py-6 max-w-3xl">
              {p.shortDescription && <p className="text-slate-300 font-medium">{p.shortDescription}</p>}
              <p className="mt-3 text-sm text-slate-400 whitespace-pre-line leading-relaxed">{p.description || "No detailed description available."}</p>
              {p.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.map((t) => <span key={t} className="text-xs rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-slate-400">#{t}</span>)}
                </div>
              )}
              <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4"><p className="text-xs text-slate-500">Warranty</p><p className="font-bold text-white">{p.warranty || "No warranty"}</p></div>
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4"><p className="text-xs text-slate-500">Return Policy</p><p className="font-bold text-white">{p.returnPolicy || "7 days return"}</p></div>
              </div>
            </div>
          )}

          {tab === "shipping" && (
            <div className="py-6 max-w-3xl space-y-3 text-sm text-slate-300">
              <p><b className="text-white">Standard delivery:</b> 1-7 days depending on your district. Free over the zone threshold.</p>
              <p><b className="text-white">Express / Same-day:</b> available in Kathmandu Valley and Pokhara on eligible products.</p>
              <p><b className="text-white">Returns:</b> {p.returnPolicy || "7 days return"} — request from your orders page. Refunds are processed after quality check.</p>
              <p><b className="text-white">Payments:</b> Cash on Delivery, eSewa and Khalti. All online payments are verified server-side.</p>
            </div>
          )}

          {tab === "reviews" && (
            <div id="reviews" className="py-6 grid lg:grid-cols-3 gap-8">
              <div>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 text-center">
                  <p className="text-4xl font-black text-white">{Number(p.ratingAvg).toFixed(1)}</p>
                  <div className="mt-1 flex justify-center"><Stars value={Number(p.ratingAvg)} size={16} /></div>
                  <p className="mt-1 text-xs text-slate-500">{p.reviewCount} verified ratings</p>
                  <div className="mt-4 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const c = data.reviews.breakdown.find((b) => b.rating === s)?.count ?? 0;
                      const pct = p.reviewCount > 0 ? Math.round((c / p.reviewCount) * 100) : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 w-6">{s}★</span>
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
                          <span className="text-slate-500 w-8 text-right">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Write review */}
                <div className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <h4 className="text-sm font-bold text-white">Write a Review</h4>
                  {!user ? (
                    <p className="mt-2 text-sm text-slate-400">Please <Link href={`/login?next=/products/${slug}`} className="text-amber-400 font-bold">sign in</Link> to write a review.</p>
                  ) : !data.canReview && !data.myReview ? (
                    <p className="mt-2 text-sm text-slate-400">Only customers with a delivered order of this product can review it.</p>
                  ) : (
                    <form onSubmit={submitReview} className="mt-3 space-y-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button type="button" key={s} onClick={() => setRRating(s)}><Star className={`h-6 w-6 ${s <= rRating ? "text-amber-400 fill-current" : "text-slate-600"}`} /></button>
                        ))}
                      </div>
                      <input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Review title" maxLength={120}
                        className="w-full h-10 rounded-xl bg-slate-900 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
                      <textarea value={rComment} onChange={(e) => setRComment(e.target.value)} placeholder="Share your experience..." maxLength={2000} rows={3}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none" />
                      <button disabled={rSaving} className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white disabled:opacity-50">
                        {rSaving ? "Submitting..." : data.myReview ? "Update Review" : "Submit Review"}
                      </button>
                      {rMsg && <p className="text-xs font-bold text-emerald-400">{rMsg}</p>}
                    </form>
                  )}
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                {data.reviews.items.length === 0 && <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>}
                {data.reviews.items.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white">{r.userName.charAt(0)}</span>
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-2">{r.userName}
                          {r.verifiedPurchase && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><BadgeCheck className="h-3 w-3" /> Verified Purchase</span>}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(r.createdAt)}</p>
                      </div>
                      <span className="ml-auto"><Stars value={r.rating} size={13} /></span>
                    </div>
                    {r.title && <p className="mt-3 text-sm font-bold text-white">{r.title}</p>}
                    {r.comment && <p className="mt-1 text-sm text-slate-300 leading-relaxed">{r.comment}</p>}
                    {r.vendorReply && (
                      <div className="mt-3 rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
                        <p className="text-[11px] font-bold text-amber-400 uppercase">Seller Response</p>
                        <p className="mt-1 text-sm text-slate-300">{r.vendorReply}</p>
                      </div>
                    )}
                    <button onClick={() => helpful(r.id)} className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors">
                      <ThumbsUp className="h-3.5 w-3.5" /> Helpful ({r.helpfulCount})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related */}
        {data.related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-black text-white mb-4">Related Products</h2>
            <div className="scroll-row flex gap-4 overflow-x-auto pb-2">
              {data.related.map((r, i) => <ProductCard key={r.id} product={r} index={i} />)}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
