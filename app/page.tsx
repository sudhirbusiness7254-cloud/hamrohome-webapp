'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Clock3, Facebook, Instagram, Linkedin, Mail, Play, Search, ShieldCheck, Sparkles, Star, Twitter, UserRound, Zap } from 'lucide-react';
import { AccountModal, CartDrawer, CheckoutModal, LocationModal, ProductModal } from '@/components/ShopOverlays';
import { SiteHeader } from '@/components/SiteHeader';
import { ProductCard } from '@/components/ProductCard';
import { brands, categories, formatNpr, products, testimonials, Product } from './data';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All finds');
  const [sort, setSort] = useState('Featured');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([3]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [location, setLocation] = useState('Kathmandu Valley');
  const [toast, setToast] = useState('');
  const [testimonial, setTestimonial] = useState(0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesCategory = category === 'All finds' || product.category === category;
      const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
    if (sort === 'Price: low to high') return [...result].sort((a, b) => a.price - b.price);
    if (sort === 'Top rated') return [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [category, search, sort]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { product, quantity: 1 }];
    });
    showToast(`${product.name} added to your bag`);
  };

  const changeQuantity = (id: number, change: number) => setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: Math.max(0, line.quantity + change) } : line).filter((line) => line.quantity > 0));
  const removeFromCart = (id: number) => setCart((current) => current.filter((line) => line.product.id !== id));
  const toggleWishlist = (id: number) => setWishlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <div className="bazzaro-app">
    <SiteHeader cartCount={cartCount} wishlistCount={wishlist.length} search={search} onSearchChange={setSearch} onCart={() => setCartOpen(true)} onWishlist={() => { document.getElementById('just-in')?.scrollIntoView({ behavior: 'smooth' }); showToast('Your saved finds are marked with a heart'); }} onAccount={() => setAccountOpen(true)} onLocation={() => setLocationOpen(true)} location={location} />

    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy"><div className="eyebrow light"><span className="eyebrow-spark">✦</span> Nepal&apos;s considered marketplace</div><h1>The good stuff,<br /><em>gathered.</em></h1><p>Discover thoughtful products from local makers, trusted brands and the people shaping how Nepal shops.</p><div className="hero-actions"><button className="primary-button light-button" onClick={() => document.getElementById('just-in')?.scrollIntoView({ behavior: 'smooth' })}>Explore the edit <ArrowRight size={17} /></button><button className="text-button light-text" onClick={() => document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth' })}><span className="play-circle"><Play size={12} fill="currentColor" /></span> Our story</button></div><div className="hero-trust"><div className="mini-avatars"><span>AK</span><span>SM</span><span>NT</span><b>+</b></div><span>Loved by <strong>12,000+</strong> curious shoppers</span></div></div>
          <div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-card hero-card-main"><img src="https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1000&q=85" alt="Scented bottle and botanicals" /><span className="hero-card-tag">New season<br /><strong>essentials</strong></span></div><div className="hero-card hero-card-small"><img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=85" alt="Soft everyday clothing" /></div><div className="hero-note"><Sparkles size={14} /> Curated in Nepal</div><div className="hero-sticker">Good<br /><span>finds</span><i>↗</i></div></div>
        </div>
        <div className="hero-bottom"><div className="container hero-bottom-inner"><span>Thoughtful picks</span><i /><span>Local makers</span><i /><span>Easy returns</span><i /><span>Delivery across Nepal</span><div className="hero-scroll">Scroll to explore <span>↓</span></div></div></div>
      </section>

      <section className="section categories-section" id="categories"><div className="container"><div className="section-heading"><div><span className="eyebrow">Start somewhere good</span><h2>Browse by what you need</h2></div><button className="text-button" onClick={() => { setCategory('All finds'); document.getElementById('just-in')?.scrollIntoView({ behavior: 'smooth' }); }}>View all categories <ArrowRight size={16} /></button></div><div className="category-scroller">{categories.map((item) => <button className="category-tile" key={item.name} onClick={() => { setCategory(item.name); document.getElementById('just-in')?.scrollIntoView({ behavior: 'smooth' }); }}><div className={`category-image ${item.color}`}><img src={item.image} alt="" loading="lazy" /><span><ArrowRight size={17} /></span></div><strong>{item.name}</strong><small>{item.count}</small></button>)}</div></div></section>

      <section className="container ribbon"><div className="ribbon-item"><span className="ribbon-icon"><TruckIcon /></span><div><strong>Delivery that fits your day</strong><span>Choose standard, express or pickup at checkout</span></div></div><div className="ribbon-item"><span className="ribbon-icon"><ShieldCheck size={18} /></span><div><strong>Shop with confidence</strong><span>Verified sellers and easy 7-day returns</span></div></div><div className="ribbon-item"><span className="ribbon-icon"><Sparkles size={18} /></span><div><strong>Worth your scroll</strong><span>Thoughtful curation, never endless noise</span></div></div></section>

      <section className="section deals-section" id="deals"><div className="container"><div className="section-heading deals-heading"><div><span className="eyebrow terracotta-eyebrow"><Zap size={13} fill="currentColor" /> Limited edit</span><h2>Good things, for less.</h2><p>A little nudge to bring home something you&apos;ll love.</p></div><div className="deal-countdown"><span>Ends in</span><b>06</b><i>:</i><b>42</b><i>:</i><b>18</b></div></div><div className="deal-grid"><article className="deal-feature"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85" alt="Cloudstep knit sneakers" /><div className="deal-feature-copy"><span className="eyebrow">The weekend uniform</span><h3>Light on your feet.<br />Easy on your wallet.</h3><p>Up to 30% off daily essentials from Kalo Studio.</p><button className="dark-button" onClick={() => { setCategory('Fashion'); document.getElementById('just-in')?.scrollIntoView({ behavior: 'smooth' }); }}>Shop the edit <ArrowRight size={16} /></button></div><span className="deal-sticker">up to<br /><strong>30%</strong><br />off</span></article><div className="deal-side"><DealProduct product={products[5]} onAdd={addToCart} onQuickView={setSelectedProduct} /><DealProduct product={products[6]} onAdd={addToCart} onQuickView={setSelectedProduct} /></div></div></div></section>

      <section className="section products-section" id="just-in"><div className="container"><div className="section-heading products-heading"><div><span className="eyebrow">A considered edit</span><h2>Find your next favourite</h2></div><div className="heading-note"><span className="pulse-dot" /> Fresh picks, updated daily</div></div><div className="product-toolbar"><div className="filter-pills"><button className={category === 'All finds' ? 'active' : ''} onClick={() => setCategory('All finds')}>All finds</button><button className={category === 'Fashion' ? 'active' : ''} onClick={() => setCategory('Fashion')}>Fashion</button><button className={category === 'Home & living' ? 'active' : ''} onClick={() => setCategory('Home & living')}>Home & living</button><button className={category === 'Tech & gadgets' ? 'active' : ''} onClick={() => setCategory('Tech & gadgets')}>Tech</button><button className={category === 'Beauty & care' ? 'active' : ''} onClick={() => setCategory('Beauty & care')}>Beauty</button></div><label className="sort-select">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Featured</option><option>Top rated</option><option>Price: low to high</option></select></label></div>{search && <div className="search-result-note"><Search size={15} /> Showing finds for <strong>&quot;{search}&quot;</strong><button onClick={() => setSearch('')}>Clear</button></div>}<div className="product-grid">{filteredProducts.map((product) => <ProductCard product={product} key={product.id} wished={wishlist.includes(product.id)} onWish={toggleWishlist} onAdd={addToCart} onQuickView={setSelectedProduct} />)}</div>{filteredProducts.length === 0 && <div className="empty-results"><Search size={28} /><h3>No finds here yet</h3><p>Try another search or browse all of our considered picks.</p><button className="secondary-button" onClick={() => { setSearch(''); setCategory('All finds'); }}>Show all finds</button></div>}<div className="view-all-row"><span>Showing {filteredProducts.length} of 240+ considered finds</span><button className="outline-button" onClick={() => showToast('You have reached the end of this edit')}>Load more <ArrowRight size={16} /></button></div></div></section>

      <section className="local-banner" id="sellers"><div className="container local-grid"><div className="local-copy"><span className="eyebrow">Meet the people behind it</span><h2>Small labels.<br /><em>Big point of view.</em></h2><p>From a two-person studio in Patan to a family-run workshop in Bhaktapur — Bazzaro brings Nepal&apos;s independent sellers closer to you.</p><button className="primary-button" onClick={() => showToast('Seller stories are coming to your inbox soon')}>Meet our sellers <ArrowRight size={17} /></button><div className="local-proof"><span className="local-number">180<sup>+</sup></span><span>independent sellers<br />and still growing</span></div></div><div className="local-images"><div className="local-image-main"><img src="https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=950&q=85" alt="A maker working with ceramics" /><span className="image-caption">Mithila House · Bhaktapur</span></div><div className="local-image-small"><img src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=600&q=85" alt="Tools in a local workshop" /></div><div className="local-quote"><span>“</span><p>Made slowly.<br />Meant to last.</p></div></div></div></section>

      <section className="section brands-section" id="brands"><div className="container"><div className="section-heading"><div><span className="eyebrow">Names worth knowing</span><h2>Say hello to local favourites</h2></div><button className="text-button" onClick={() => showToast('All brands are coming soon')}>Explore brands <ArrowRight size={16} /></button></div><div className="brand-row">{brands.map((brand) => <button className="brand-tile" key={brand.name} onClick={() => showToast(`${brand.name} store coming soon`)}><span className={`brand-logo ${brand.style}`}>{brand.mark}</span><strong>{brand.name}</strong><small>Shop now <ArrowRight size={12} /></small></button>)}</div></div></section>

      <section className="story-section" id="stories"><div className="container story-grid"><div className="story-video"><img src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=85" alt="Artist painting in a bright studio" /><button className="story-play" onClick={() => showToast('Our story video is coming soon')}><Play size={18} fill="currentColor" /></button><span className="story-video-label">Watch our story <b>01:24</b></span></div><div className="story-copy"><span className="eyebrow">Why Bazzaro?</span><h2>A marketplace with a little more <em>meaning.</em></h2><p>We believe shopping can be a way to support the people, places and ideas that make Nepal special. So we make it easier to find the good stuff — and the stories behind it.</p><div className="story-points"><div><span>01</span><strong>Curated, not crowded</strong><p>Less scrolling. Better finds.</p></div><div><span>02</span><strong>Rooted here</strong><p>Local talent, fairly spotlighted.</p></div><div><span>03</span><strong>Made for real life</strong><p>Simple delivery, easy returns.</p></div></div><Link className="text-button" href="/about">Read our story <ArrowRight size={16} /></Link></div></div></section>

      <section className="section testimonial-section"><div className="container testimonial-inner"><div className="testimonial-intro"><span className="eyebrow">The nice things people say</span><h2>Good company<br /><em>to keep.</em></h2><div className="testimonial-controls"><button onClick={() => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length)} aria-label="Previous testimonial">←</button><span>0{testimonial + 1} <i>/</i> 0{testimonials.length}</span><button onClick={() => setTestimonial((testimonial + 1) % testimonials.length)} aria-label="Next testimonial">→</button></div></div><div className="testimonial-quote"><span className="quote-mark">“</span><blockquote>{testimonials[testimonial].quote}</blockquote><div className="quote-author"><span>{testimonials[testimonial].initials}</span><div><strong>{testimonials[testimonial].name}</strong><small>{testimonials[testimonial].meta}</small></div><span className="quote-stars">★★★★★</span></div></div></div></section>

      <section className="newsletter-section"><div className="container newsletter-inner"><div><span className="eyebrow">A good note in your inbox</span><h2>Come for the finds.<br /><em>Stay for the good stuff.</em></h2></div><form onSubmit={(event) => { event.preventDefault(); showToast('You are on the list — welcome in'); }}><label><Mail size={18} /><input type="email" required placeholder="Your email address" /></label><button className="primary-button" type="submit">Join the list <ArrowRight size={16} /></button><small>No spam, ever. Just new finds and nice stories.</small></form></div></section>
    </main>

    <footer className="site-footer"><div className="container footer-top"><div className="footer-brand"><Link className="brand footer-brand-link" href="/"><span className="brand-mark"><span /><span /><span /><span /></span><span>bazzaro</span></Link><p>Good things, gathered<br />in one place.</p><div className="socials"><a href="#" aria-label="Instagram"><Instagram size={17} /></a><a href="#" aria-label="Facebook"><Facebook size={17} /></a><a href="#" aria-label="Twitter"><Twitter size={17} /></a><a href="#" aria-label="LinkedIn"><Linkedin size={17} /></a></div></div><div className="footer-links"><div><strong>Discover</strong><Link href="#just-in">All finds</Link><Link href="#deals">Deals</Link><Link href="#categories">Categories</Link><Link href="#brands">Brands</Link></div><div><strong>For you</strong><Link href="/account">My account</Link><Link href="#">Orders & returns</Link><Link href="#">Saved finds</Link><Link href="#">Help centre</Link></div><div><strong>For sellers</strong><Link href="/vendor">Sell on Bazzaro</Link><Link href="/vendor">Seller dashboard</Link><Link href="#">Seller guidelines</Link><Link href="#">Partner with us</Link></div><div><strong>We are here</strong><span>Kathmandu, Nepal</span><span>hello@bazzaro.com</span><span>Sun–Fri · 10am–6pm</span></div></div></div><div className="container footer-bottom"><span>© 2025 Bazzaro Marketplace Pvt. Ltd.</span><div><span>Privacy</span><span>Terms</span><span>Shipping</span></div><span>Made with care in Nepal <span className="footer-heart">♥</span></span></div></footer>

    <div className="mobile-bottom-nav"><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><HomeIcon /><span>Home</span></button><button onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}><Search size={20} /><span>Explore</span></button><button onClick={() => setCartOpen(true)} className="mobile-cart"><ShoppingBagIcon /><i>{cartCount}</i><span>Bag</span></button><button onClick={() => setAccountOpen(true)}><UserRound size={20} /><span>Account</span></button></div>

    <CartDrawer open={cartOpen} lines={cart} onClose={() => setCartOpen(false)} onChangeQuantity={changeQuantity} onRemove={removeFromCart} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
    <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} wished={selectedProduct ? wishlist.includes(selectedProduct.id) : false} onWish={() => selectedProduct && toggleWishlist(selectedProduct.id)} />
    <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} onSelect={(value) => { setLocation(value); showToast(`Delivery location updated to ${value}`); }} />
    <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} onToast={showToast} />
    <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} total={cartTotal} onToast={showToast} />
    {toast && <div className="toast"><span><CheckIcon /></span>{toast}</div>}
  </div>;
}

function DealProduct({ product, onAdd, onQuickView }: { product: Product; onAdd: (product: Product) => void; onQuickView: (product: Product) => void }) { return <article className="deal-product"><div className="deal-product-image"><img src={product.image} alt={product.name} onClick={() => onQuickView(product)} /><span>{product.badge}</span></div><div><span>{product.brand}</span><h3>{product.name}</h3><div><strong>{formatNpr(product.price)}</strong>{product.originalPrice && <del>{formatNpr(product.originalPrice)}</del>}</div><button onClick={() => onAdd(product)}>Add to bag <PlusIcon /></button></div></article>; }
function TruckIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="1.7" /><circle cx="18" cy="19" r="1.7" /></svg>; }
function HomeIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" /></svg>; }
function ShoppingBagIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5.5 8.5h13l1 12h-15l1-12Z" /><path d="M9 9V6.5a3 3 0 0 1 6 0V9" /></svg>; }
function PlusIcon() { return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg>; }
