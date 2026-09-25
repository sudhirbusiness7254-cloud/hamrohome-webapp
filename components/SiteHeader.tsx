'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Heart, MapPin, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';

type SiteHeaderProps = {
  cartCount: number;
  wishlistCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onCart: () => void;
  onWishlist: () => void;
  onAccount: () => void;
  onLocation: () => void;
  location: string;
};

export function SiteHeader({ cartCount, wishlistCount, search, onSearchChange, onCart, onWishlist, onAccount, onLocation, location }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="announcement">
        <div className="container announcement-inner">
          <span><i className="announcement-dot" /> Free delivery on orders above Rs. 2,000</span>
          <div className="announcement-links"><span>Download app</span><span>Help centre</span><span>English <ChevronDown size={12} /></span></div>
        </div>
      </div>
      <div className="container header-main">
        <Link className="brand" href="/" aria-label="Bazzaro home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>bazzaro</span>
        </Link>
        <button className="location-pill" onClick={onLocation} aria-label="Change delivery location">
          <MapPin size={16} strokeWidth={2.3} />
          <span><small>Deliver to</small><strong>{location}</strong></span>
          <ChevronDown size={15} />
        </button>
        <label className="search-box">
          <Search size={18} />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search for products, brands and more" aria-label="Search products" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="header-actions">
          <button className="icon-action notification-action" aria-label="Notifications"><Bell size={21} /><i /></button>
          <button className="icon-action" onClick={onWishlist} aria-label="Wishlist"><Heart size={21} /><em>{wishlistCount}</em></button>
          <button className="icon-action" onClick={onCart} aria-label="Shopping bag"><ShoppingBag size={21} /><em>{cartCount}</em></button>
          <button className="account-action" onClick={onAccount}><span className="avatar">SG</span><span className="account-copy"><small>Welcome back</small><strong>Sign in <ChevronDown size={13} /></strong></span></button>
          <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Open menu">{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      <nav className={`category-nav ${mobileOpen ? 'mobile-visible' : ''}`}>
        <div className="container category-nav-inner">
          <Link href="#categories" onClick={() => setMobileOpen(false)} className="nav-category"><Menu size={16} /> Shop by category <ChevronDown size={13} /></Link>
          <span className="nav-divider" />
          <Link href="#deals" onClick={() => setMobileOpen(false)}>Deals</Link>
          <Link href="#just-in" onClick={() => setMobileOpen(false)}>Just in</Link>
          <Link href="#sellers" onClick={() => setMobileOpen(false)}>Local sellers</Link>
          <Link href="#brands" onClick={() => setMobileOpen(false)}>Brands</Link>
          <Link href="#stories" onClick={() => setMobileOpen(false)}>Bazzaro stories</Link>
          <span className="nav-spacer" />
          <Link className="sell-link" href="/vendor">Sell on Bazzaro <span>↗</span></Link>
        </div>
      </nav>
    </header>
  );
}
