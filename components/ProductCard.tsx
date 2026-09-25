'use client';

import { Heart, Plus, Star } from 'lucide-react';
import { formatNpr, Product } from '@/app/data';

type ProductCardProps = {
  product: Product;
  wished: boolean;
  onWish: (id: number) => void;
  onAdd: (product: Product) => void;
  onQuickView: (product: Product) => void;
};

export function ProductCard({ product, wished, onWish, onAdd, onQuickView }: ProductCardProps) {
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  return (
    <article className="product-card">
      <div className={`product-image ${product.tone}`} onClick={() => onQuickView(product)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onQuickView(product)}>
        <img src={product.image} alt={product.name} loading="lazy" />
        <div className="product-badges"><span className="product-badge">{product.badge || 'Bazzaro pick'}</span>{discount > 0 && <span className="discount-badge">{discount}% off</span>}</div>
        <button className={`wish-button ${wished ? 'wished' : ''}`} onClick={(event) => { event.stopPropagation(); onWish(product.id); }} aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}><Heart size={18} fill={wished ? 'currentColor' : 'none'} /></button>
        <button className="quick-add" onClick={(event) => { event.stopPropagation(); onAdd(product); }} aria-label={`Add ${product.name} to cart`}><Plus size={19} /></button>
      </div>
      <div className="product-info" onClick={() => onQuickView(product)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onQuickView(product)}>
        <div className="product-meta"><span>{product.brand}</span><span className="rating"><Star size={12} fill="currentColor" /> {product.rating}</span></div>
        <h3>{product.name}</h3>
        <div className="price-row"><strong>{formatNpr(product.price)}</strong>{product.originalPrice && <del>{formatNpr(product.originalPrice)}</del>}</div>
        <span className="review-count">{product.reviews} reviews</span>
      </div>
    </article>
  );
}
