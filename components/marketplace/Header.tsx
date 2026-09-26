"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Heart, User, Package, ChevronDown, MapPin, Truck,
  Star, Zap, Menu, X, Sparkles, Home, Shirt, Smartphone, BookOpen,
  Dumbbell, ShoppingBasket, LogOut, LayoutDashboard, Store, Bell, Headphones,
} from "lucide-react";
import { useAuthStore, useCartStore, useWishlistStore } from "@/lib/store";
import { api } from "@/lib/client";
import { formatNPR } from "@/lib/format";

const NAV_CATEGORIES = [
  { label: "All", icon: Menu, href: "/products" },
  { label: "Offers", icon: Zap, href: "/products?sort=discount" },
  { label: "New Arrivals", icon: Sparkles, href: "/products?sort=newest" },
  { label: "Best Sellers", icon: Star, href: "/products?sort=bestselling" },
  { label: "Electronics", icon: Smartphone, href: "/category/electronics" },
  { label: "Fashion", icon: Shirt, href: "/category/fashion" },
  { label: "Home & Kitchen", icon: Home, href: "/category/home-kitchen" },
  { label: "Beauty", icon: Sparkles, href: "/category/beauty" },
  { label: "Sports", icon: Dumbbell, href: "/category/sports" },
  { label: "Groceries", icon: ShoppingBasket, href: "/category/groceries" },
  { label: "Books", icon: BookOpen, href: "/category/books" },
  { label: "Help & Support", icon: Headphones, href: "/support" },
];

const DISTRICTS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Kaski", "Dhanusha", "Morang", "Chitwan", "Rupandehi", "Kavrepalanchok", "Other"];

type Suggest = {
  products: { name: string; slug: string; price: number; salePrice: number | null }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
};

export function Header() {
  const router = useRouter();
  const { user, loaded, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.count);
  const wishIds = useWishlistStore((s) => s.ids);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [district, setDistrict] = useState("Kathmandu");

  // search
  const [term, setTerm] = useState("");
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    try {
      const d = localStorage.getItem("bz_district");
      if (d) setDistrict(d);
    } catch { /* ignore */ }
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) { setSuggest(null); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api<Suggest>(`/api/catalog/suggest?q=${encodeURIComponent(term.trim())}`);
        setSuggest(data);
        setSuggestOpen(true);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!term.trim()) return;
    setSuggestOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  const pickDistrict = (d: string) => {
    setDistrict(d);
    try { localStorage.setItem("bz_district", d); } catch { /* ignore */ }
    setLocOpen(false);
  };

  const doLogout = async () => {
    await logout();
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Promo ticker */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 overflow-hidden">
        <div className="ticker-scroll flex whitespace-nowrap py-1.5 text-[11px] font-bold text-slate-950">
          {[0, 1].map((k) => (
            <div key={k} className="flex">
              <span className="mx-8 flex items-center gap-1.5"><Truck className="h-3 w-3" /> Free delivery in Kathmandu Valley on orders over Rs.2,000</span>
              <span className="mx-8 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Flash Sale: Up to 40% off electronics</span>
              <span className="mx-8 flex items-center gap-1.5"><Star className="h-3 w-3" /> Use code SAVE10 for 10% off your order</span>
              <Link href="/support" className="mx-8 flex items-center gap-1.5 hover:underline"><Bell className="h-3 w-3" /> Need support? WhatsApp, call or email us</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Main bar */}
      <div className={`transition-all duration-500 ${scrolled ? "bg-slate-950/95 backdrop-blur-xl shadow-lg shadow-black/20" : "bg-gradient-to-b from-slate-900 to-slate-950"}`}>
        <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 lg:px-6 py-2.5">
          <Link href="/" className="flex-shrink-0 group">
            <div className="flex items-center gap-1.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">B</div>
              <span className="text-xl font-black tracking-tight"><span className="text-amber-400">Bazz</span><span className="text-white">aro</span></span>
            </div>
          </Link>

          {/* Deliver to */}
          <div className="relative hidden lg:block">
            <button onClick={() => setLocOpen(!locOpen)} className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500/40 transition-colors">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-500 leading-none">Deliver to</div>
                <div className="font-semibold text-white leading-none mt-0.5 max-w-[90px] truncate">{district}</div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>
            {locOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 max-h-72 overflow-y-auto bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-1 z-50">
                {DISTRICTS.map((d) => (
                  <button key={d} onClick={() => pickDistrict(d)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${district === d ? "bg-amber-500/10 text-amber-400 font-bold" : "text-slate-300 hover:bg-slate-800"}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div ref={searchRef} className="flex-1 relative max-w-2xl">
            <form onSubmit={submitSearch} className="flex h-11 rounded-xl border-2 border-amber-500/80 overflow-hidden bg-white shadow-lg shadow-amber-500/10 focus-within:border-amber-400 transition-all">
              <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} onFocus={() => suggest && setSuggestOpen(true)}
                placeholder="Search Bazzaro — phones, rice, shoes..." className="flex-1 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none" />
              <button type="submit" className="px-5 flex items-center justify-center bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 transition-all">
                <Search className="h-5 w-5" />
              </button>
            </form>
            {suggestOpen && suggest && (suggest.products.length + suggest.categories.length + suggest.brands.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                {suggest.categories.map((c) => (
                  <button key={c.slug} onClick={() => { setSuggestOpen(false); setTerm(""); router.push(`/category/${c.slug}`); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-amber-50 flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-slate-400" /> <span>in <b>{c.name}</b> — {term}</span>
                  </button>
                ))}
                {suggest.products.map((p) => (
                  <button key={p.slug} onClick={() => { setSuggestOpen(false); setTerm(""); router.push(`/products/${p.slug}`); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-800 font-medium truncate">{p.name}</span>
                    <span className="text-xs font-bold text-amber-600 flex-shrink-0">{formatNPR(p.salePrice ?? p.price)}</span>
                  </button>
                ))}
                {suggest.brands.map((b) => (
                  <button key={b.slug} onClick={() => { setSuggestOpen(false); setTerm(""); router.push(`/brand/${b.slug}`); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-amber-50">Brand: <b>{b.name}</b></button>
                ))}
                <button onClick={submitSearch} className="w-full px-4 py-2.5 bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 text-center">
                  See all results for &ldquo;{term}&rdquo;
                </button>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/account?tab=orders" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
              <Truck className="h-5 w-5" />
              <span className="hidden xl:block text-left"><span className="block text-[10px] text-slate-500 leading-none">Track</span><span className="block font-bold text-white leading-none mt-0.5 text-xs">Orders</span></span>
            </Link>
            <Link href="/wishlist" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
              <span className="relative">
                <Heart className="h-5 w-5" />
                {wishIds.length > 0 && <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center px-1">{wishIds.length}</span>}
              </span>
              <span className="hidden xl:block text-left"><span className="block text-[10px] text-slate-500 leading-none">Wishlist</span><span className="block font-bold text-white leading-none mt-0.5 text-xs">{wishIds.length} items</span></span>
            </Link>
            <Link href="/cart" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-all">
              <span className="relative" key={cartCount}>
                <ShoppingCart className="h-5 w-5 cart-bounce" />
                {cartCount > 0 && <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center px-1 pulse-badge">{cartCount}</span>}
              </span>
              <span className="hidden xl:block text-left"><span className="block text-[10px] text-slate-500 leading-none">Cart</span><span className="block font-bold text-white leading-none mt-0.5 text-xs">{cartCount} items</span></span>
            </Link>
            <div className="ml-1 h-8 w-px bg-slate-700" />
            {loaded && user ? (
              <div className="relative ml-1">
                <button onClick={() => setAccountOpen(!accountOpen)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-800 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-[10px] text-slate-400 leading-none max-w-[100px] truncate">Hello, {user.name.split(" ")[0]}</div>
                    <div className="font-bold text-white leading-none mt-0.5 text-xs flex items-center gap-0.5">Account <ChevronDown className="h-3 w-3" /></div>
                  </div>
                </button>
                {accountOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-800 mb-1">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <AcctLink href="/account" icon={<User className="h-4 w-4" />} label="My Account" onClick={() => setAccountOpen(false)} />
                    <AcctLink href="/account?tab=orders" icon={<Package className="h-4 w-4" />} label="My Orders" onClick={() => setAccountOpen(false)} />
                    <AcctLink href="/account?tab=notifications" icon={<Bell className="h-4 w-4" />} label="Notifications" onClick={() => setAccountOpen(false)} />
                    <AcctLink href="/support" icon={<Headphones className="h-4 w-4" />} label="Help & Support" onClick={() => setAccountOpen(false)} />
                    {user.role === "vendor" && <AcctLink href="/vendor" icon={<Store className="h-4 w-4" />} label="Vendor Dashboard" onClick={() => setAccountOpen(false)} />}
                    {user.role === "admin" && <AcctLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Admin Panel" onClick={() => setAccountOpen(false)} />}
                    {user.role === "customer" && <AcctLink href="/vendor/register" icon={<Store className="h-4 w-4" />} label="Become a Seller" onClick={() => setAccountOpen(false)} />}
                    <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-slate-800 transition-colors">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : loaded ? (
              <div className="flex items-center gap-2 ml-1">
                <Link href="/login" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors">Sign In</Link>
                <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all">Register</Link>
              </div>
            ) : null}
          </div>

          {/* Mobile icons */}
          <div className="flex lg:hidden items-center gap-1 ml-auto">
            <Link href="/wishlist" className="relative p-2 text-slate-300"><Heart className="h-5 w-5" />
              {wishIds.length > 0 && <span className="absolute top-0.5 right-0.5 h-4 min-w-[16px] rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center px-1">{wishIds.length}</span>}
            </Link>
            <Link href="/cart" className="relative p-2 text-amber-400"><ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 h-4 min-w-[16px] rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center px-1">{cartCount}</span>}
            </Link>
            <button className="p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="lg:hidden px-4 pb-3">
          <form onSubmit={submitSearch} className="flex h-10 rounded-xl border-2 border-amber-500/80 overflow-hidden bg-white">
            <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search Bazzaro..." className="flex-1 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none" />
            <button type="submit" className="px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white"><Search className="h-4 w-4" /></button>
          </form>
        </div>
      </div>

      {/* Category nav */}
      <nav className="bg-slate-900/95 backdrop-blur border-t border-slate-800/80 hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="scroll-row flex items-center gap-0.5 overflow-x-auto">
            {NAV_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.label} href={cat.href}
                  className="cat-pill flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition-all flex-shrink-0">
                  <Icon className="h-3.5 w-3.5" /> {cat.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900 shadow-2xl p-6 flex flex-col gap-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-black text-amber-400">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)}><X className="h-5 w-5 text-white" /></button>
            </div>
            {NAV_CATEGORIES.map((c) => (
              <Link key={c.label} href={c.href} onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-amber-500/10 hover:text-amber-400 transition-all">
                <c.icon className="h-4 w-4" /> {c.label}
              </Link>
            ))}
            <div className="border-t border-slate-800 mt-4 pt-4 space-y-1">
              {user ? (
                <>
                  <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-400"><User className="h-4 w-4" /> {user.name}</Link>
                  {user.role === "vendor" && <Link href="/vendor" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200"><Store className="h-4 w-4" /> Vendor Dashboard</Link>}
                  {user.role === "admin" && <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200"><LayoutDashboard className="h-4 w-4" /> Admin Panel</Link>}
                  <button onClick={() => { doLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 w-full"><LogOut className="h-4 w-4" /> Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200"><User className="h-4 w-4" /> Sign In</Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-400"><User className="h-4 w-4" /> Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function AcctLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
      {icon} {label}
    </Link>
  );
}
