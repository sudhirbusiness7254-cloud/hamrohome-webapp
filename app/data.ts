export type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  tone: string;
  image: string;
  vendor: string;
  description: string;
};

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;

export const categories = [
  { name: 'Fashion', count: '2.4k items', image: unsplash('photo-1490481651871-ab68de25d43d'), color: 'sand' },
  { name: 'Home & living', count: '1.8k items', image: unsplash('photo-1555041469-a586c61ea9bc'), color: 'lavender' },
  { name: 'Tech & gadgets', count: '980 items', image: unsplash('photo-1468495244123-6c6c332eeece'), color: 'blue' },
  { name: 'Beauty & care', count: '1.1k items', image: unsplash('photo-1596462502278-27bfdc403348'), color: 'peach' },
  { name: 'Sports & outdoors', count: '760 items', image: unsplash('photo-1552674605-db6ffd4facb5'), color: 'green' },
  { name: 'Local finds', count: '640 items', image: unsplash('photo-1531058020387-3be344556be6'), color: 'yellow' }
];

export const products: Product[] = [
  {
    id: 1,
    name: 'Sajilo Everyday Backpack',
    brand: 'Himalayan Carry',
    category: 'Fashion',
    price: 2890,
    originalPrice: 3490,
    rating: 4.8,
    reviews: 124,
    badge: 'Bestseller',
    tone: 'blush',
    image: unsplash('photo-1553062407-98eeb64c6a62'),
    vendor: 'Himalayan Carry Co.',
    description: 'A weather-ready everyday carry, thoughtfully made for Kathmandu commutes and weekend escapes.'
  },
  {
    id: 2,
    name: 'Echo Buds Pro',
    brand: 'Auralab',
    category: 'Tech & gadgets',
    price: 5499,
    originalPrice: 6999,
    rating: 4.7,
    reviews: 89,
    badge: '−21%',
    tone: 'lilac',
    image: unsplash('photo-1606220945770-b5b6c2c55bf1'),
    vendor: 'Auralab Nepal',
    description: 'Immersive sound, adaptive noise cancellation and a pocket-sized case that goes everywhere.'
  },
  {
    id: 3,
    name: 'Cloudstep Knit Sneakers',
    brand: 'Kalo Studio',
    category: 'Fashion',
    price: 4200,
    originalPrice: 5200,
    rating: 4.9,
    reviews: 211,
    badge: 'Top rated',
    tone: 'sky',
    image: unsplash('photo-1542291026-7eec264c27ff'),
    vendor: 'Kalo Studio',
    description: 'Lightweight knit sneakers designed for long walks, busy days and everything in between.'
  },
  {
    id: 4,
    name: 'Nepa Loom Throw',
    brand: 'Mithila House',
    category: 'Home & living',
    price: 1790,
    originalPrice: 2200,
    rating: 4.6,
    reviews: 57,
    badge: 'Local maker',
    tone: 'butter',
    image: unsplash('photo-1584100936595-c0654b55a2e2'),
    vendor: 'Mithila House',
    description: 'A hand-finished cotton throw with a warm, modern pattern inspired by Nepalese craft.'
  },
  {
    id: 5,
    name: 'Mono Desk Lamp',
    brand: 'Ghar Objects',
    category: 'Home & living',
    price: 2350,
    rating: 4.5,
    reviews: 42,
    badge: 'New',
    tone: 'peach',
    image: unsplash('photo-1507473885765-e6ed057f782c'),
    vendor: 'Ghar Objects',
    description: 'A soft-glow desk companion with a tactile finish and a clean silhouette for focused spaces.'
  },
  {
    id: 6,
    name: 'Everyday SPF 50',
    brand: 'Nourish Lab',
    category: 'Beauty & care',
    price: 1250,
    originalPrice: 1500,
    rating: 4.8,
    reviews: 308,
    badge: 'Most loved',
    tone: 'cream',
    image: unsplash('photo-1556228720-195a672e8a03'),
    vendor: 'Nourish Lab Nepal',
    description: 'A lightweight, non-sticky daily sunscreen made for sunny valley days and sensitive skin.'
  },
  {
    id: 7,
    name: 'Trail Flask 750ml',
    brand: 'Ridge & River',
    category: 'Sports & outdoors',
    price: 1590,
    originalPrice: 1990,
    rating: 4.7,
    reviews: 76,
    badge: '−20%',
    tone: 'sage',
    image: unsplash('photo-1602143407151-7111542de6e8'),
    vendor: 'Ridge & River',
    description: 'Double-wall insulated steel flask for hikes, commutes and slow mornings by the trail.'
  },
  {
    id: 8,
    name: 'Mellow Daily Tee',
    brand: 'Kalo Studio',
    category: 'Fashion',
    price: 990,
    originalPrice: 1290,
    rating: 4.6,
    reviews: 164,
    badge: 'Everyday pick',
    tone: 'blue',
    image: unsplash('photo-1521572163474-6864f9cf17ab'),
    vendor: 'Kalo Studio',
    description: 'Soft organic cotton, a relaxed cut and the kind of colour you will reach for every day.'
  }
];

export const brands = [
  { name: 'Kalo Studio', mark: 'KS', style: 'terracotta' },
  { name: 'Himalayan Carry', mark: 'HC', style: 'forest' },
  { name: 'Nourish Lab', mark: 'NL', style: 'lilac' },
  { name: 'Ghar Objects', mark: 'GO', style: 'sun' },
  { name: 'Auralab', mark: 'AU', style: 'ink' }
];

export const testimonials = [
  { quote: 'It feels like discovering the good parts of the city in one calm scroll.', name: 'Sanjita R.', meta: 'Verified customer · Lalitpur', initials: 'SR' },
  { quote: 'My go-to for local makers. Delivery was quick and the packaging was beautiful.', name: 'Aayush K.', meta: 'Verified customer · Kathmandu', initials: 'AK' },
  { quote: 'Finally, a marketplace that makes small Nepalese brands feel premium.', name: 'Nima T.', meta: 'Verified customer · Pokhara', initials: 'NT' }
];

export const formatNpr = (value: number) => `Rs. ${value.toLocaleString('en-IN')}`;
