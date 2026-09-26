"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ChevronRight, Heart, Check, MessageCircle } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_URL, SUPPORT_PHONE_DISPLAY, SUPPORT_CALL_URL, SUPPORT_WHATSAPP_URL } from "@/lib/contact";

const LINKS = {
  shop: [
    { label: "New Arrivals", href: "/products?sort=newest" },
    { label: "Best Sellers", href: "/products?sort=bestselling" },
    { label: "Flash Sales", href: "/flash-sales" },
    { label: "All Products", href: "/products" },
  ],
  categories: [
    { label: "Electronics", href: "/category/electronics" },
    { label: "Fashion", href: "/category/fashion" },
    { label: "Groceries", href: "/category/groceries" },
    { label: "Home & Kitchen", href: "/category/home-kitchen" },
  ],
  account: [
    { label: "My Orders", href: "/account?tab=orders" },
    { label: "My Wishlist", href: "/wishlist" },
    { label: "My Addresses", href: "/account?tab=addresses" },
    { label: "Help & Support", href: "/support" },
    { label: "Contact Us", href: "/contact" },
  ],
  seller: [
    { label: "Sell on Bazzaro", href: "/vendor/register" },
    { label: "Vendor Dashboard", href: "/vendor" },
    { label: "Seller Wallet", href: "/vendor?tab=wallet" },
    { label: "Track Orders", href: "/account?tab=orders" },
  ],
};

export function Footer({ showNewsletter = true }: { showNewsletter?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem("bz_newsletter") || "[]");
      if (!list.includes(email.trim().toLowerCase())) {
        list.push(email.trim().toLowerCase());
        localStorage.setItem("bz_newsletter", JSON.stringify(list));
      }
    } catch { /* ignore */ }
    setDone(true);
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      {showNewsletter && (
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12">
          <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-800/80 to-slate-800 border border-slate-700/50 p-8 lg:p-12 shimmer">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-black text-white">Never Miss a <span className="gradient-text">Deal</span></h3>
                <p className="mt-2 text-sm text-slate-400 max-w-sm">Subscribe for exclusive coupons, flash sale alerts and new product launches.</p>
              </div>
              {done ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
                  <span className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><Check className="h-5 w-5 text-white" /></span>
                  <div>
                    <p className="text-sm font-bold text-white">You are subscribed!</p>
                    <p className="text-xs text-slate-400">Watch your inbox for deals and coupons.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={subscribe}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address"
                        className="w-full h-12 rounded-xl bg-slate-900 border border-slate-600 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>
                    <button type="submit" className="h-12 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all active:scale-[0.97] flex items-center gap-1.5">
                      Subscribe <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {error && <p className="mt-2 text-xs font-bold text-rose-400">{error}</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 border-t border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-1.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white">B</div>
              <span className="text-lg font-black"><span className="text-amber-400">Bazz</span><span className="text-white">aro</span></span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Nepal&apos;s trusted multi-vendor marketplace. Shop from thousands of verified local sellers.</p>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-emerald-300 transition-colors"><MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp: {SUPPORT_PHONE_DISPLAY}</a>
              <a href={SUPPORT_CALL_URL} className="flex items-center gap-2 hover:text-amber-300 transition-colors"><Phone className="h-3.5 w-3.5 text-amber-400" /> Call: {SUPPORT_PHONE_DISPLAY}</a>
              <a href={SUPPORT_EMAIL_URL} className="flex items-center gap-2 hover:text-amber-300 transition-colors"><Mail className="h-3.5 w-3.5 text-amber-400" /> {SUPPORT_EMAIL}</a>
              <div className="flex items-center gap-2 text-slate-500"><MapPin className="h-3 w-3 text-amber-400" /> Nepal</div>
            </div>
          </div>
          <FooterCol title="Shop" links={LINKS.shop} />
          <FooterCol title="Categories" links={LINKS.categories} />
          <FooterCol title="Account" links={LINKS.account} />
          <FooterCol title="Sell on Bazzaro" links={LINKS.seller} />
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Bazzaro. Made with <Heart className="h-3 w-3 text-rose-500 inline" /> in Nepal. <span className="mx-1 text-slate-700">·</span><Link href="/support" className="font-semibold text-slate-400 hover:text-amber-400 transition-colors">Made by Sudhir Yadav</Link></p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-white mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}><Link href={l.href} className="text-sm text-slate-400 hover:text-amber-400 transition-colors">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
