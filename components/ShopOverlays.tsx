'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Clock3, CreditCard, Gift, Heart, Minus, Plus, ShieldCheck, Truck, X, Zap } from 'lucide-react';
import { formatNpr, Product } from '@/app/data';

type CartLine = { product: Product; quantity: number };

type CartDrawerProps = {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onChangeQuantity: (id: number, change: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
};

export function CartDrawer({ open, lines, onClose, onChangeQuantity, onRemove, onCheckout }: CartDrawerProps) {
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const delivery = subtotal >= 2000 || subtotal === 0 ? 0 : 120;
  const total = subtotal + delivery;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return <>
    <div className="overlay" onClick={onClose} />
    <aside className="cart-drawer" aria-label="Shopping bag">
      <div className="drawer-head"><div><span className="eyebrow">Your bag</span><h2>{lines.length ? `${lines.length} ${lines.length === 1 ? 'item' : 'items'}` : 'A little empty'}</h2></div><button className="close-button" onClick={onClose} aria-label="Close cart"><X size={20} /></button></div>
      {lines.length ? <>
        <div className="cart-lines">{lines.map(({ product, quantity }) => <div className="cart-line" key={product.id}>
          <div className={`cart-thumb ${product.tone}`}><img src={product.image} alt="" /></div>
          <div className="cart-line-copy"><span>{product.brand}</span><h3>{product.name}</h3><strong>{formatNpr(product.price)}</strong><div className="quantity-control"><button onClick={() => onChangeQuantity(product.id, -1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => onChangeQuantity(product.id, 1)} aria-label="Increase quantity"><Plus size={13} /></button></div></div>
          <button className="remove-line" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name}`}><X size={15} /></button>
        </div>)}</div>
        <div className="delivery-note"><Gift size={18} /><span>Add <strong>{formatNpr(Math.max(0, 2000 - subtotal))}</strong> more for <b>free delivery</b></span></div>
        <div className="drawer-summary"><div><span>Subtotal</span><strong>{formatNpr(subtotal)}</strong></div><div><span>Delivery</span><strong>{delivery ? formatNpr(delivery) : 'Free'}</strong></div><div className="total-line"><span>Total</span><strong>{formatNpr(total)}</strong></div></div>
        <button className="primary-button full-width" onClick={onCheckout}>Go to checkout <ArrowRight size={17} /></button>
        <p className="secure-note"><ShieldCheck size={14} /> Secure checkout · easy returns</p>
      </> : <div className="empty-cart"><div className="empty-icon"><ShoppingBagIcon /></div><h3>Your bag is ready for something good.</h3><p>Explore curated finds from independent makers and brands across Nepal.</p><button className="secondary-button" onClick={onClose}>Start shopping <ArrowRight size={16} /></button></div>}
    </aside>
  </>;
}

function ShoppingBagIcon() { return <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5.5 8.5h13l1 12h-15l1-12Z" /><path d="M9 9V6.5a3 3 0 0 1 6 0V9" /></svg>; }

type ProductModalProps = { product: Product | null; onClose: () => void; onAdd: (product: Product) => void; wished: boolean; onWish: () => void };
export function ProductModal({ product, onClose, onAdd, wished, onWish }: ProductModalProps) {
  if (!product) return null;
  return <><div className="overlay" onClick={onClose} /><div className="product-modal" role="dialog" aria-modal="true" aria-label={product.name}>
    <button className="close-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
    <div className={`modal-product-image ${product.tone}`}><img src={product.image} alt={product.name} /></div>
    <div className="modal-product-copy"><div className="product-meta"><span>{product.brand}</span><span className="rating"><StarIcon /> {product.rating} · {product.reviews} reviews</span></div><h2>{product.name}</h2><p>{product.description}</p><div className="modal-price"><strong>{formatNpr(product.price)}</strong>{product.originalPrice && <del>{formatNpr(product.originalPrice)}</del>}<span>Inclusive of taxes</span></div><div className="size-selector"><span>Colour</span><div><button className="colour-dot one" /><button className="colour-dot two" /><button className="colour-dot three" /></div></div><div className="modal-actions"><button className="primary-button" onClick={() => { onAdd(product); onClose(); }}>Add to bag <Plus size={17} /></button><button className={`outline-icon ${wished ? 'wished' : ''}`} onClick={onWish} aria-label="Wishlist"><Heart size={20} fill={wished ? 'currentColor' : 'none'} /></button></div><div className="modal-perks"><span><Truck size={16} /> Delivery in 2–4 days</span><span><ShieldCheck size={16} /> 7 day easy returns</span></div></div>
  </div></>;
}
function StarIcon() { return <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" /></svg>; }

type LocationModalProps = { open: boolean; onClose: () => void; onSelect: (location: string) => void };
export function LocationModal({ open, onClose, onSelect }: LocationModalProps) {
  const cities = ['Kathmandu Valley', 'Pokhara', 'Biratnagar', 'Lalitpur', 'Bhaktapur'];
  if (!open) return null;
  return <><div className="overlay" onClick={onClose} /><div className="small-modal location-modal"><button className="close-button modal-close" onClick={onClose}><X size={19} /></button><div className="modal-symbol"><Truck size={22} /></div><span className="eyebrow">Delivery location</span><h2>Where should we deliver?</h2><p>We will show you the most accurate delivery options and dates.</p><div className="location-options">{cities.map((city, index) => <button key={city} className={index === 0 ? 'selected' : ''} onClick={() => { onSelect(city); onClose(); }}><span className="location-radio" />{city}<ChevronRight size={16} /></button>)}</div></div></>;
}

type AccountModalProps = { open: boolean; onClose: () => void; onToast: (message: string) => void };
export function AccountModal({ open, onClose, onToast }: AccountModalProps) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  if (!open) return null;
  return <><div className="overlay" onClick={onClose} /><div className="small-modal account-modal"><button className="close-button modal-close" onClick={onClose}><X size={19} /></button><span className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Join Bazzaro'}</span><h2>{mode === 'signin' ? 'Good things await.' : 'Make room for good finds.'}</h2><p>{mode === 'signin' ? 'Sign in to see your orders, saved finds and more.' : 'Create an account to save favourites and checkout faster.'}</p><button className="google-button" onClick={() => onToast('Google sign-in is ready to connect')}><span className="google-mark">G</span> Continue with Google</button><div className="or-line"><span>or continue with email</span></div><label className="field-label">Email address<input type="email" placeholder="you@example.com" /></label>{mode === 'signin' && <label className="field-label">Password<input type="password" placeholder="••••••••" /></label>}{mode === 'create' && <label className="field-label">Create password<input type="password" placeholder="At least 8 characters" /></label>}<button className="primary-button full-width" onClick={() => { onToast(mode === 'signin' ? 'Welcome back to Bazzaro' : 'Account created — welcome to Bazzaro'); onClose(); }}>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button><button className="switch-mode" onClick={() => setMode(mode === 'signin' ? 'create' : 'signin')}>{mode === 'signin' ? 'New to Bazzaro? Create an account' : 'Already have an account? Sign in'}</button></div></>;
}

type CheckoutModalProps = { open: boolean; onClose: () => void; total: number; onToast: (message: string) => void };
export function CheckoutModal({ open, onClose, total, onToast }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  if (!open) return null;
  const steps = ['Address', 'Delivery', 'Payment'];
  return <><div className="overlay" onClick={onClose} /><div className="checkout-modal"><div className="checkout-head"><div><span className="eyebrow">Bazzaro checkout</span><h2>Almost yours.</h2></div><button className="close-button" onClick={onClose}><X size={20} /></button></div><div className="checkout-steps">{steps.map((label, index) => <div className={`checkout-step ${step > index + 1 ? 'done' : ''} ${step === index + 1 ? 'active' : ''}`} key={label}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span>{label}</div>)}</div><div className="checkout-content">{step === 1 && <><h3>Where should we send it?</h3><p className="muted-copy">Add a delivery address to see accurate dates.</p><label className="field-label">Full name<input placeholder="Your full name" /></label><label className="field-label">Address<input placeholder="House / street / area" /></label><div className="two-fields"><label className="field-label">City<select defaultValue="Kathmandu"><option>Kathmandu</option><option>Lalitpur</option><option>Bhaktapur</option><option>Pokhara</option></select></label><label className="field-label">Phone number<input placeholder="98XXXXXXXX" /></label></div></>}{step === 2 && <><h3>Choose delivery</h3><p className="muted-copy">All orders are handled with care by our delivery partners.</p><button className="delivery-option selected"><span><Truck size={19} /></span><div><strong>Standard delivery</strong><small>Arrives in 2–4 business days</small></div><b>Free</b></button><button className="delivery-option"><span><Zap size={19} /></span><div><strong>Express delivery</strong><small>Arrives tomorrow in Kathmandu Valley</small></div><b>Rs. 180</b></button></>}{step === 3 && <><h3>Select payment method</h3><p className="muted-copy">Secure, encrypted payments. You can also pay on delivery.</p><button className="delivery-option selected"><span><CreditCard size={19} /></span><div><strong>Cash on delivery</strong><small>Pay when your order arrives</small></div><b>COD</b></button><button className="delivery-option"><span className="esewa-logo">e</span><div><strong>eSewa / Khalti</strong><small>Pay securely with your wallet</small></div><b>Online</b></button></>}</div><div className="checkout-footer"><div><span>Total to pay</span><strong>{formatNpr(total)}</strong></div>{step < 3 ? <button className="primary-button" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></button> : <button className="primary-button" onClick={() => { onToast('Order placed — we will keep you posted'); onClose(); setStep(1); }}>Place order <Check size={16} /></button>}</div></div></>;
}
