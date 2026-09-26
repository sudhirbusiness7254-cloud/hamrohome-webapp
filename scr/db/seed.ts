/**
 * Bazzaro seed — realistic Nepal-focused marketplace data.
 * Run: npx tsx src/db/seed.ts
 */
import { db } from "./index";
import * as s from "./schema";
import { hashPassword } from "../lib/password";
import { sql, eq } from "drizzle-orm";
import { seedMedia } from "./seed-media";

async function truncateAll() {
  // Order matters (FK-safe)
  await db.execute(sql`
    TRUNCATE TABLE
      reviews, returns, vendor_transactions, withdrawals, payments,
      order_items, order_status_history, orders, coupon_usages,
      notifications, support_messages, support_tickets,
      inventory_transactions, cart_items, carts, wishlists, recently_viewed,
      flash_sale_products, flash_sales, product_images, product_videos,
      product_variants, products, vendors, addresses, users,
      categories, brands, delivery_zones, coupons, banners,
      homepage_sections, settings, audit_logs
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  console.log("Seeding Bazzaro…");
  await truncateAll();

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const adminPw = await hashPassword("Admin@1234");
  const vendorPw = await hashPassword("Vendor@1234");
  const customerPw = await hashPassword("Customer@1234");

  const admin = await db
    .insert(s.users)
    .values({
      name: "Bazzaro Admin",
      email: "admin@bazzaro.com",
      phone: "9800000001",
      passwordHash: adminPw,
      role: "admin",
      adminTier: "super_admin",
      emailVerifiedAt: new Date(),
      avatarColor: "#0f172b",
    })
    .returning();

  const hulak = await db
    .insert(s.users)
    .values({
      name: "Bikash Rai",
      email: "vendor@hulak.com",
      phone: "9801000001",
      passwordHash: vendorPw,
      role: "vendor",
      emailVerifiedAt: new Date(),
      avatarColor: "#0ea5e9",
    })
    .returning();

  const annapurna = await db
    .insert(s.users)
    .values({
      name: "Sunita Shrestha",
      email: "vendor@annapurna.com",
      phone: "9801000002",
      passwordHash: vendorPw,
      role: "vendor",
      emailVerifiedAt: new Date(),
      avatarColor: "#22c55e",
    })
    .returning();

  const mandala = await db
    .insert(s.users)
    .values({
      name: "Kiran Gurung",
      email: "vendor@mandala.com",
      phone: "9801000003",
      passwordHash: vendorPw,
      role: "vendor",
      emailVerifiedAt: new Date(),
      avatarColor: "#d946ef",
    })
    .returning();

  const urbanfeet = await db
    .insert(s.users)
    .values({
      name: "Prakash Tamang",
      email: "vendor@urbanfeet.com",
      phone: "9801000004",
      passwordHash: vendorPw,
      role: "vendor",
      emailVerifiedAt: new Date(),
      avatarColor: "#ec4899",
    })
    .returning();

  const aarav = await db
    .insert(s.users)
    .values({
      name: "Aarav Sharma",
      email: "customer@bazzaro.com",
      phone: "9812000001",
      passwordHash: customerPw,
      role: "customer",
      emailVerifiedAt: new Date(),
      avatarColor: "#f59e0b",
    })
    .returning();

  const ram = await db
    .insert(s.users)
    .values({
      name: "Ram Thapa",
      email: "ram.thapa@example.com",
      phone: "9812000002",
      passwordHash: customerPw,
      role: "customer",
      emailVerifiedAt: new Date(),
      avatarColor: "#6366f1",
    })
    .returning();

  const sita = await db
    .insert(s.users)
    .values({
      name: "Sita Gurung",
      email: "sita.gurung@example.com",
      phone: "9812000003",
      passwordHash: customerPw,
      role: "customer",
      emailVerifiedAt: new Date(),
      avatarColor: "#10b981",
    })
    .returning();

  const [hulakUser] = hulak;
  const [annapurnaUser] = annapurna;
  const [mandalaUser] = mandala;
  const [urbanfeetUser] = urbanfeet;
  const [aaravUser] = aarav;
  const [ramUser] = ram;
  const [sitaUser] = sita;

  // -------------------------------------------------------------------------
  // Vendors
  // -------------------------------------------------------------------------
  await db.insert(s.vendors).values([
    {
      userId: hulakUser.id,
      shopName: "Hulak Electronics",
      slug: "hulak-electronics",
      description:
        "Gadgets and electronics sourced directly from authorized distributors across Kathmandu Valley.",
      status: "approved",
      commissionRate: "10",
      businessName: "Hulak Electronics Pvt. Ltd.",
      panVatNumber: "123456",
      bankName: "NMB Bank",
      bankAccount: "1234567890",
      bankHolder: "Bikash Rai",
      reviewedAt: new Date(),
    },
    {
      userId: annapurnaUser.id,
      shopName: "Annapurna Groceries",
      slug: "annapurna-groceries",
      description:
        "Farm-fresh groceries, organic rice, tea and Himalayan spices delivered to your door.",
      status: "approved",
      commissionRate: "8",
      businessName: "Annapurna Grocery Traders",
      panVatNumber: "234567",
      bankName: "NIC Asia Bank",
      bankAccount: "2345678901",
      bankHolder: "Sunita Shrestha",
      reviewedAt: new Date(),
    },
    {
      userId: mandalaUser.id,
      shopName: "Mandala Beauty & Care",
      slug: "mandala-beauty",
      description:
        "Natural Himalayan beauty products — yak wool cream, chamomile soap and more.",
      status: "approved",
      commissionRate: "12",
      businessName: "Mandala Botanicals",
      panVatNumber: "345678",
      bankName: "Everest Bank",
      bankAccount: "3456789012",
      bankHolder: "Kiran Gurung",
      reviewedAt: new Date(),
    },
    {
      userId: urbanfeetUser.id,
      shopName: "UrbanFeet Fashion",
      slug: "urbanfeet-fashion",
      description: "Streetwear and trekking apparel for the modern Nepali.",
      status: "pending",
      commissionRate: "10",
      businessName: "UrbanFeet Apparel",
      panVatNumber: "456789",
      bankName: "Global IME Bank",
      bankAccount: "4567890123",
      bankHolder: "Prakash Tamang",
    },
  ]);

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  const catRows = await db
    .insert(s.categories)
    .values([
      { name: "Electronics", slug: "electronics", icon: "Smartphone", color: "#0ea5e9", sortOrder: 1 },
      { name: "Fashion", slug: "fashion", icon: "Shirt", color: "#ec4899", sortOrder: 2 },
      { name: "Groceries", slug: "groceries", icon: "ShoppingBasket", color: "#22c55e", sortOrder: 3 },
      { name: "Home & Kitchen", slug: "home-kitchen", icon: "Home", color: "#06b6d4", sortOrder: 4 },
      { name: "Beauty", slug: "beauty", icon: "Sparkles", color: "#d946ef", sortOrder: 5 },
      { name: "Sports", slug: "sports", icon: "Dumbbell", color: "#10b981", sortOrder: 6 },
      { name: "Books", slug: "books", icon: "BookOpen", color: "#64748b", sortOrder: 7 },
    ])
    .returning();

  const catByName = Object.fromEntries(catRows.map((c) => [c.name, c]));
  const mobile = await db
    .insert(s.categories)
    .values({ name: "Mobile Phones", slug: "mobile-phones", icon: "Phone", color: "#3b82f6", parentId: catByName["Electronics"].id, sortOrder: 1 })
    .returning();
  const laptops = await db
    .insert(s.categories)
    .values({ name: "Laptops", slug: "laptops", icon: "Laptop", color: "#6366f1", parentId: catByName["Electronics"].id, sortOrder: 2 })
    .returning();
  const mens = await db
    .insert(s.categories)
    .values({ name: "Men's Wear", slug: "mens-wear", icon: "User", color: "#f97316", parentId: catByName["Fashion"].id, sortOrder: 1 })
    .returning();
  const footware = await db
    .insert(s.categories)
    .values({ name: "Footwear", slug: "footwear", icon: "Footprints", color: "#84cc16", parentId: catByName["Fashion"].id, sortOrder: 2 })
    .returning();
  const riceGrains = await db
    .insert(s.categories)
    .values({ name: "Rice & Grains", slug: "rice-grains", icon: "Wheat", color: "#eab308", parentId: catByName["Groceries"].id, sortOrder: 1 })
    .returning();
  const teaSpices = await db
    .insert(s.categories)
    .values({ name: "Tea & Spices", slug: "tea-spices", icon: "Coffee", color: "#ef4444", parentId: catByName["Groceries"].id, sortOrder: 2 })
    .returning();

  // -------------------------------------------------------------------------
  // Brands
  // -------------------------------------------------------------------------
  const brandRows = await db
    .insert(s.brands)
    .values([
      { name: "Summit", slug: "summit", color: "#0ea5e9" },
      { name: "UrbanFeet", slug: "urbanfeet", color: "#ec4899" },
      { name: "NepalCraft", slug: "nepalcraft", color: "#f59e0b" },
      { name: "Everest", slug: "everest", color: "#22c55e" },
      { name: "SajiloTech", slug: "sajilotech", color: "#6366f1" },
      { name: "Mandala", slug: "mandala", color: "#d946ef" },
      { name: "Annapurna", slug: "annapurna", color: "#10b981" },
      { name: "Himalaya", slug: "himalaya", color: "#a855f7" },
    ])
    .returning();
  const brandByName = Object.fromEntries(brandRows.map((b) => [b.name, b]));

  // -------------------------------------------------------------------------
  // Delivery zones
  // -------------------------------------------------------------------------
  await db.insert(s.deliveryZones).values([
    { name: "Kathmandu Valley", districts: ["Kathmandu", "Lalitpur", "Bhaktapur", "Kavrepalanchok"], fee: 100, freeThreshold: 2000, estDaysMin: 1, estDaysMax: 2, expressEnabled: true, sameDayEnabled: true, sortOrder: 1 },
    { name: "Pokhara", districts: ["Kaski"], fee: 150, freeThreshold: 3000, estDaysMin: 2, estDaysMax: 3, expressEnabled: true, sortOrder: 2 },
    { name: "Janakpur", districts: ["Dhanusha"], fee: 200, freeThreshold: 3000, estDaysMin: 3, estDaysMax: 5, sortOrder: 3 },
    { name: "Biratnagar", districts: ["Morang"], fee: 200, freeThreshold: 3000, estDaysMin: 3, estDaysMax: 5, sortOrder: 4 },
    { name: "Other Districts", districts: ["All other districts"], fee: 250, freeThreshold: 4000, estDaysMin: 4, estDaysMax: 7, sortOrder: 5 },
  ]);

  // -------------------------------------------------------------------------
  // Products (with variants)
  // -------------------------------------------------------------------------
  type SeedProduct = {
    name: string;
    vendor: string;
    category: string;
    brand?: string;
    price: number;
    sale?: number;
    stock: number;
    short: string;
    desc: string;
    tags?: string[];
    featured?: boolean;
    status?: "approved" | "pending";
    warranty?: string | null;
    returnPolicy?: string;
    colors?: { name: string; color: string; price?: number; stock: number }[];
    sizes?: string[];
  };

  const productSeeds: SeedProduct[] = [
    {
      name: "NovaPhone X1 5G 256GB",
      vendor: "hulak", category: "mobile-phones", brand: "Summit",
      price: 145000, sale: 132900, stock: 14,
      short: "Flagship 5G smartphone with 120Hz AMOLED display.",
      desc: "NovaPhone X1 5G packs a 64MP triple camera, 5000mAh battery with 45W fast charge and Oxygen-style NovaOS. 8GB RAM, 256GB storage. Nepal warranty included.",
      tags: ["5g", "smartphone", "flagship"], featured: true, warranty: "1 year", returnPolicy: "7 days return",
      colors: [
        { name: "Black", color: "#111827", stock: 6 },
        { name: "White", color: "#f3f4f6", stock: 4 },
        { name: "Blue", color: "#2563eb", stock: 4 },
      ],
    },
    {
      name: "EverestPad Pro 14 Laptop",
      vendor: "hulak", category: "laptops", brand: "Everest",
      price: 98000, stock: 9,
      short: "14-inch ultrabook, Ryzen 7, 16GB RAM, 512GB SSD.",
      desc: "Lightweight 1.4kg aluminium laptop with 14-inch 2.2K display, 8-hour battery, backlit keyboard. Windows 11 Home.",
      tags: ["laptop", "ultrabook"], featured: true, warranty: "2 years", returnPolicy: "10 days return",
      colors: [{ name: "Silver", color: "#cbd5e1", stock: 5 }, { name: "Space Grey", color: "#475569", stock: 4 }],
    },
    {
      name: "Sajilo Buds TWS Earbuds",
      vendor: "hulak", category: "Electronics", brand: "SajiloTech",
      price: 4500, sale: 3200, stock: 60,
      short: "True wireless earbuds with ANC and 30hr battery.",
      desc: "Hybrid active noise cancellation, IPX5 water resistance, 30 hours total playback with case, Bluetooth 5.3.",
      tags: ["audio", "earbuds"], featured: true, warranty: "6 months", returnPolicy: "7 days return",
      colors: [{ name: "Black", color: "#111827", stock: 40 }, { name: "Pearl", color: "#f8fafc", stock: 20 }],
    },
    {
      name: "Nova Watch 5 Smartwatch",
      vendor: "hulak", category: "Electronics", brand: "Summit",
      price: 32000, sale: 27900, stock: 22,
      short: "AMOLED smartwatch with GPS, heart-rate and sleep tracking.",
      desc: "1.43-inch AMOLED always-on display, built-in GPS, 100+ sport modes, 7-day battery, 5ATM water resistance.",
      tags: ["wearable", "smartwatch"], warranty: "1 year", returnPolicy: "7 days return",
      colors: [{ name: "Black", color: "#111827", stock: 12 }, { name: "Rose", color: "#fbcfe8", stock: 10 }],
    },
    {
      name: "65W GaN Wall Charger",
      vendor: "hulak", category: "Electronics", brand: "SajiloTech",
      price: 3800, stock: 120,
      short: "Compact 65W GaN charger — laptop and phone fast charge.",
      desc: "GaN II technology, dual USB-C + USB-A ports, foldable pins, PD 3.0 PPS support.",
      tags: ["charger", "accessory"], warranty: "1 year", returnPolicy: "7 days return",
    },
    {
      name: "Cruzer 4K Action Camera",
      vendor: "hulak", category: "Electronics", brand: "SajiloTech",
      price: 27500, sale: 23900, stock: 16,
      short: "4K/60fps action cam with EIS and waterproof case.",
      desc: "Shoot in 4K60 with horizon-lock stabilization, voice control, waterproof to 40m, includes mounts and remote.",
      tags: ["camera", "action"], warranty: "1 year", returnPolicy: "7 days return",
    },
    {
      name: "NovaPhone X2 5G 512GB",
      vendor: "hulak", category: "mobile-phones", brand: "Summit",
      price: 189000, stock: 8,
      short: "Next-gen flagship with 200MP camera and satellite SOS.",
      desc: "NovaPhone X2 — 6.8-inch LTPO display, 200MP main camera, 5500mAh, 65W charging. Awaiting admin approval.",
      tags: ["5g", "smartphone"], status: "pending", warranty: "1 year", returnPolicy: "7 days return",
    },
    {
      name: "Daura-Surwal Set (Classic)",
      vendor: "mandala", category: "mens-wear", brand: "Himalaya",
      price: 8500, sale: 7200, stock: 25,
      short: "Authentic Nepali woven Daura-Surwal in premium wool.",
      desc: "Hand-woven traditional Daura-Surwal with classic patterns. Perfect for festivals and formal occasions. Sizes S–XL.",
      tags: ["traditional", "festival"], featured: true, warranty: null, returnPolicy: "14 days return",
      colors: [{ name: "Cream", color: "#fef3c7", stock: 10 }, { name: "Rust", color: "#c2410c", stock: 15 }],
      sizes: ["S", "M", "L", "XL"],
    },
    {
      name: "Kathmandu Hoodie",
      vendor: "mandala", category: "mens-wear", brand: "Himalaya",
      price: 4200, sale: 2990, stock: 42,
      short: "Heavyweight fleece hoodie inspired by Kathmandu streets.",
      desc: "400gsm brushed fleece, kangaroo pocket, embroidered Bazzaro x Kathmandu collab logo.",
      tags: ["hoodie", "streetwear"], featured: true, warranty: null, returnPolicy: "14 days return",
      colors: [{ name: "Charcoal", color: "#374151", stock: 20 }, { name: "Mustard", color: "#f59e0b", stock: 22 }],
      sizes: ["S", "M", "L", "XL"],
    },
    {
      name: "UrbanFeet Trek Pro Shoes",
      vendor: "mandala", category: "footwear", brand: "UrbanFeet",
      price: 8900, sale: 7400, stock: 30,
      short: "Waterproof trekking shoes with Vibram sole.",
      desc: "Gore-tex style waterproof membrane, padded ankle collar, Vibram outsole for Himalayan trails.",
      tags: ["trekking", "shoes"], featured: true, warranty: null, returnPolicy: "14 days return",
      colors: [{ name: "Black", color: "#111827", stock: 16 }, { name: "Red", color: "#dc2626", stock: 14 }],
      sizes: ["7", "8", "9", "10", "11"],
    },
    {
      name: "Annapurna Fleece Jacket",
      vendor: "mandala", category: "mens-wear", brand: "Himalaya",
      price: 5600, stock: 18,
      short: "Windproof fleece jacket for cold Himalayan mornings.",
      desc: "Two-layer windproof shell with sherpa fleece lining. Packs into its own pocket.",
      tags: ["jacket", "winter"], warranty: null, returnPolicy: "14 days return",
      colors: [{ name: "Olive", color: "#4d7c0f", stock: 10 }, { name: "Navy", color: "#1e3a8a", stock: 8 }],
      sizes: ["M", "L", "XL"],
    },
    {
      name: "Gandaki Sella Rice 10kg",
      vendor: "annapurna", category: "rice-grains", brand: "Annapurna",
      price: 2400, stock: 80,
      short: "Premium hand-pounded sella rice from Gandaki plains.",
      desc: "Aromatic long-grain sella rice, 10kg premium bag. Washed and polished.",
      tags: ["rice", "staple"], featured: true, warranty: null, returnPolicy: "5 days return",
    },
    {
      name: "Illamici Gold Tea 500g",
      vendor: "annapurna", category: "tea-spices", brand: "Mandala",
      price: 1450, sale: 1180, stock: 120,
      short: "First flush green tea from Illam hills.",
      desc: "Hand-plucked first flush tea leaves, shade-grown, 500g airtight tin.",
      tags: ["tea", "organic"], featured: true, warranty: null, returnPolicy: "5 days return",
    },
    {
      name: "Timur (Sichuan Pepper) 200g",
      vendor: "annapurna", category: "tea-spices", brand: "Annapurna",
      price: 380, stock: 200,
      short: "Sun-dried timur from Dolakha — the signature Nepali spice.",
      desc: "Whole dried timor peppercorns with natural numbing aroma. 200g pack.",
      tags: ["spices", "timur"], warranty: null, returnPolicy: "5 days return",
    },
    {
      name: "Himalayan Wild Honey 1kg",
      vendor: "annapurna", category: "rice-grains", brand: "Everest",
      price: 2200, sale: 1890, stock: 45,
      short: "Raw wildflower honey harvested from mid-hills.",
      desc: "Unfiltered raw honey from wildflower sources in the mid-hills. 1kg glass jar.",
      tags: ["honey", "organic"], warranty: null, returnPolicy: "5 days return",
    },
    {
      name: "Mountain View Noodles (Pack of 12)",
      vendor: "annapurna", category: "rice-grains", brand: "Annapurna",
      price: 250, stock: 300,
      short: "Masala noodles — pack of 12 sachets.",
      desc: "Classic masala noodles with authentic Nepali spices. 12 packets per box.",
      tags: ["snacks", "instant"], warranty: null, returnPolicy: "5 days return",
    },
    {
      name: "Handforged Copper Karai 24cm",
      vendor: "annapurna", category: "Home & Kitchen", brand: "NepalCraft",
      price: 4200, sale: 3600, stock: 15,
      short: "Hand-hammered copper karai for authentic Nepali cooking.",
      desc: "Tin-lined hand-hammered copper karai, 24cm. Ideal for achar and tarkari.",
      tags: ["cookware", "handcrafted"], warranty: null, returnPolicy: "7 days return",
      colors: [{ name: "Copper", color: "#b45309", stock: 15 }],
    },
    {
      name: "Handwoven Dhaka Rug",
      vendor: "annapurna", category: "Home & Kitchen", brand: "NepalCraft",
      price: 9500, sale: 7900, stock: 10,
      short: "Machine-printed dhaka pattern rug, 5x7 ft.",
      desc: "Vibrant dhaka-inspired rug with geometric mountain motifs. Soft microfiber, 5x7 ft.",
      tags: ["decor", "dhaka"], featured: true, warranty: null, returnPolicy: "14 days return",
      colors: [{ name: "Multi", color: "#dc2626", stock: 10 }],
    },
    {
      name: "Bamboo Steamer Set (3-tier)",
      vendor: "annapurna", category: "Home & Kitchen", brand: "NepalCraft",
      price: 1800, stock: 35,
      short: "Sustainable bamboo steamer for momos and rice.",
      desc: "3-tier bamboo steamer set with cotton liners. Fits standard pots.",
      tags: ["cookware", "bamboo"], warranty: null, returnPolicy: "7 days return",
    },
    {
      name: "Yak Wool Facial Cream",
      vendor: "mandala", category: "Beauty", brand: "Mandala",
      price: 950, sale: 720, stock: 60,
      short: "Hand-cream with yak milk and apricot oil.",
      desc: "Rich hand cream with yak milk protein, apricot kernel oil and almond. 100ml tube.",
      tags: ["skincare", "natural"], featured: true, warranty: null, returnPolicy: "10 days return",
    },
    {
      name: "Chamomile Soap Bar Set",
      vendor: "mandala", category: "Beauty", brand: "Mandala",
      price: 640, stock: 90,
      short: "Cold-process chamomile soap — set of 3.",
      desc: "Handmade cold-process soap with chamomile extract and honey. Set of 3 bars.",
      tags: ["soap", "handmade"], warranty: null, returnPolicy: "10 days return",
    },
    {
      name: "Everest Cricket Bat — Kashmir Willow",
      vendor: "hulak", category: "Sports", brand: "Everest",
      price: 6500, stock: 12,
      short: "English willow cricket bat, grade 1.",
      desc: "Kashmir willow cricket bat with willow handle, ready to play.",
      tags: ["cricket", "sports"], warranty: null, returnPolicy: "7 days return",
    },
    {
      name: "Himalaya Yoga Mat Pro",
      vendor: "hulak", category: "Sports", brand: "Himalaya",
      price: 2200, sale: 1790, stock: 40,
      short: "Non-slip 6mm yoga mat with carry strap.",
      desc: "High-density TPE yoga mat, double-sided non-slip texture, alignment lines, carry strap.",
      tags: ["yoga", "fitness"], warranty: null, returnPolicy: "14 days return",
    },
    {
      name: "Summit Cycling Helmet",
      vendor: "hulak", category: "Sports", brand: "Summit",
      price: 5400, sale: 4600, stock: 22,
      short: "Lightweight MIPS helmet with 20 ventilation ports.",
      desc: "MIPS rotational impact protection, 20 vents, BOA fit system, removable sun visor.",
      tags: ["cycling", "safety"], warranty: "2 years", returnPolicy: "14 days return",
    },
  ];

  const productBySlug = new Map<string, { id: string; vendorId: string; price: number; sale: number | null }>();

  for (const p of productSeeds) {
    const vendorId = [hulakUser, annapurnaUser, mandalaUser].find((u) => u.id.startsWith(p.vendor))?.id;
    const vendorMap: Record<string, string> = {
      hulak: hulakUser.id,
      annapurna: annapurnaUser.id,
      mandala: mandalaUser.id,
    };
    const vid = vendorMap[p.vendor];
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const totalVariantStock = p.colors ? p.colors.reduce((a, c) => a + c.stock, 0) : p.stock;
    const inserted = await db
      .insert(s.products)
      .values({
        vendorId: vid,
        categoryId: catByName[p.category]?.id ?? null,
        brandId: p.brand ? brandByName[p.brand]?.id ?? null : null,
        name: p.name,
        slug,
        sku: `BZ-${slug.slice(0, 12).toUpperCase()}-${p.vendor.slice(0, 3).toUpperCase()}`,
        shortDescription: p.short,
        description: p.desc,
        price: p.price,
        salePrice: p.sale ?? null,
        stock: totalVariantStock,
        lowStockThreshold: 5,
        weightGrams: 500,
        warranty: p.warranty ?? null,
        returnPolicy: p.returnPolicy ?? "7 days return",
        tags: p.tags ?? [],
        status: p.status ?? "approved",
        isFeatured: p.featured ?? false,
      })
      .returning();
    const prod = inserted[0];
    productBySlug.set(slug, { id: prod.id, vendorId: vid, price: p.price, sale: p.sale ?? null });

    // Variants: cross of colors × sizes (or single dimension)
    const colors = p.colors ?? [{ name: "Default", color: "#94a3b8", stock: p.stock }];
    const sizes = p.sizes ?? [null];
    let vIdx = 0;
    for (const c of colors) {
      for (const sz of sizes) {
        const vName = [c.name, sz].filter(Boolean).join(" / ");
        await db.insert(s.productVariants).values({
          productId: prod.id,
          name: vName,
          color: c.name,
          size: sz,
          sku: `${prod.sku}-V${vIdx + 1}`,
          price: c.price ?? null,
          stock: c.stock,
          imageColor: c.color,
        });
        vIdx++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Sample orders (delivered + one pending eSewa payment)
  // -------------------------------------------------------------------------
  const orderSeeds = [
    {
      user: aaravUser, status: "delivered" as const, method: "cod" as const, daysAgo: 6,
      items: [
        { slug: "novaphone-x1-5g-256gb", qty: 1 },
        { slug: "sajilo-buds-tws-earbuds", qty: 2 },
      ],
    },
    {
      user: ramUser, status: "delivered" as const, method: "cod" as const, daysAgo: 3,
      items: [{ slug: "urbanfeet-trek-pro-shoes", qty: 1 }],
    },
    {
      user: sitaUser, status: "pending_payment" as const, method: "esewa" as const, daysAgo: 0,
      items: [{ slug: "illamici-gold-tea-500g", qty: 3 }],
    },
  ];

  const createdOrders: { id: string; number: string; userId: string; items: { productId: string; qty: number }[]; total: number }[] = [];

  for (const o of orderSeeds) {
    const subtotal = o.items.reduce((sum, it) => {
      const p = productBySlug.get(it.slug)!;
      const unit = p.sale ?? p.price;
      return sum + unit * it.qty;
    }, 0);
    const deliveryFee = subtotal >= 2000 ? 0 : 100;
    const grandTotal = subtotal + deliveryFee;
    const createdAt = new Date(Date.now() - o.daysAgo * 86400_000);

    const [order] = await db
      .insert(s.orders)
      .values({
        orderNumber: `BZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        userId: o.user.id,
        addressSnapshot: {
          label: "Home",
          recipient: o.user.name,
          phone: o.user.phone,
          province: "Bagmati",
          district: "Kathmandu",
          city: "Kathmandu",
          ward: "12",
          street: "Koteshwor, Near Bhatbhateni",
          landmark: "Blue Roof",
        },
        deliveryZoneId: null,
        deliveryMethod: "standard",
        subtotal,
        deliveryFee,
        grandTotal,
        status: o.status,
        paymentMethod: o.method,
        paymentStatus: o.status === "pending_payment" ? "pending" : "verified",
        estimatedDelivery: new Date(Date.now() + (o.daysAgo === 0 ? 2 : 4) * 86400_000),
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    const orderItems = [];
    for (const it of o.items) {
      const p = productBySlug.get(it.slug)!;
      const unit = p.sale ?? p.price;
      const [oi] = await db
        .insert(s.orderItems)
        .values({
          orderId: order.id,
          productId: p.id,
          nameSnapshot: it.slug,
          skuSnapshot: it.slug,
          unitPrice: unit,
          quantity: it.qty,
          subtotal: unit * it.qty,
        })
        .returning();
      orderItems.push({ productId: p.id, qty: it.qty });
    }

    await db.insert(s.orderStatusHistory).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: o.status,
      note: "Order placed",
      createdAt,
    });

    if (o.status === "pending_payment") {
      await db.insert(s.payments).values({
        orderId: order.id,
        provider: "esewa",
        amount: grandTotal,
        status: "pending",
        gatewayRef: null,
      });
    } else {
      // Convert reservations into sales
      for (const it of o.items) {
        const p = productBySlug.get(it.slug)!;
        await db
          .update(s.products)
          .set({
            stock: sql`${s.products.stock} - ${it.qty}`,
            soldCount: sql`${s.products.soldCount} + ${it.qty}`,
          })
          .where(eq(s.products.id, p.id));
      }
    }

    createdOrders.push({ id: order.id, number: order.orderNumber, userId: o.user.id, items: orderItems, total: grandTotal });
  }

  // Vendor transaction for the delivered eSewa order (Aarav's first order)
  const aaravOrder = createdOrders[0];
  for (const oi of aaravOrder.items) {
    await db.insert(s.vendorTransactions).values({
      vendorId: productBySlug.get("novaphone-x1-5g-256gb")!.vendorId,
      type: "sale",
      amount: aaravOrder.total,
      orderId: aaravOrder.id,
      note: "Order confirmed",
    });
  }

  // -------------------------------------------------------------------------
  // Reviews (verified purchase only)
  // -------------------------------------------------------------------------
  const reviewSeeds = [
    { slug: "novaphone-x1-5g-256gb", userId: aaravUser.id, orderId: aaravOrder.id, rating: 5, title: "Excellent phone!", comment: "Super fast, great camera, battery easily lasts a day. Nepal warranty service was smooth too.", verified: true },
    { slug: "sajilo-buds-tws-earbuds", userId: aaravUser.id, orderId: aaravOrder.id, rating: 4, title: "Good ANC buds", comment: "Noise cancellation works well on flights. Case is a bit bulky but sound quality is great.", verified: true },
    { slug: "urbanfeet-trek-pro-shoes", userId: ramUser.id, orderId: createdOrders[1].id, rating: 5, title: "Perfect for Poon Hill trek", comment: "Grippy sole, waterproof enough for morning snow. Very comfortable for long hikes.", verified: true },
    { slug: "illamici-gold-tea-500g", userId: sitaUser.id, orderId: createdOrders[2].id, rating: 5, title: "Authentic Illam flavor", comment: "Lovely aroma, exactly like the tea we get in Illam. Will order again.", verified: true },
  ];

  for (const r of reviewSeeds) {
    const p = productBySlug.get(r.slug);
    if (!p) continue;
    await db.insert(s.reviews).values({
      productId: p.id,
      userId: r.userId,
      orderId: r.orderId,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: r.verified,
    });
    // Update product aggregate
    const all = await db.select().from(s.reviews).where(eq(s.reviews.productId, p.id));
    const avg = all.reduce((a, x) => a + x.rating, 0) / all.length;
    await db
      .update(s.products)
      .set({ ratingAvg: avg.toFixed(2), reviewCount: all.length })
      .where(eq(s.products.id, p.id));
  }

  // -------------------------------------------------------------------------
  // Coupons
  // -------------------------------------------------------------------------
  const now = Date.now();
  await db.insert(s.coupons).values([
    { code: "SAVE10", description: "10% off on your order", type: "percent", value: 10, minOrderAmount: 1000, usageLimit: 1000, perUserLimit: 1, startsAt: new Date(now - 86400_000), endsAt: new Date(now + 30 * 86400_000) },
    { code: "FIRSTORDER", description: "Rs. 500 off on your first order", type: "fixed", value: 500, minOrderAmount: 2000, perUserLimit: 1, firstOrderOnly: true, startsAt: new Date(now - 86400_000), endsAt: new Date(now + 60 * 86400_000) },
    { code: "FREESHIP", description: "Free delivery on your order", type: "fixed", value: 0, freeDelivery: true, usageLimit: 500, perUserLimit: 2, startsAt: new Date(now - 86400_000), endsAt: new Date(now + 30 * 86400_000) },
    { code: "TECH20", description: "20% off on electronics", type: "percent", value: 20, scope: "category", categoryIds: [catByName["Electronics"].id, mobile[0].id, laptops[0].id], usageLimit: 100, perUserLimit: 1, startsAt: new Date(now - 86400_000), endsAt: new Date(now + 10 * 86400_000) },
  ]);

  // -------------------------------------------------------------------------
  // Flash sale
  // -------------------------------------------------------------------------
  const [flash] = await db
    .insert(s.flashSales)
    .values({
      name: "Tech Bonanza — Up to 30% Off",
      description: "Limited-time deals on phones, earbuds and more.",
      startsAt: new Date(now - 3600_000),
      endsAt: new Date(now + 5 * 86400_000),
    })
    .returning();

  await db.insert(s.flashSaleProducts).values([
    { flashSaleId: flash.id, productId: productBySlug.get("novaphone-x1-5g-256gb")!.id, discountPercent: 20, stockLimit: 10 },
    { flashSaleId: flash.id, productId: productBySlug.get("sajilo-buds-tws-earbuds")!.id, discountPercent: 30, stockLimit: 50 },
    { flashSaleId: flash.id, productId: productBySlug.get("cruzer-4k-action-camera")!.id, discountPercent: 15, stockLimit: 20 },
  ]);

  // -------------------------------------------------------------------------
  // Homepage sections + banners + settings
  // -------------------------------------------------------------------------
  await db.insert(s.homepageSections).values([
    { key: "hero", title: "Shop Nepal, Delivered Fast", subtitle: "Groceries, gadgets, fashion and more — from local sellers you can trust.", enabled: true, sortOrder: 1 },
    { key: "flash_sale", title: "Flash Sale", subtitle: "Limited-time deals, every day.", enabled: true, sortOrder: 2 },
    { key: "categories", title: "Popular Categories", subtitle: "", enabled: true, sortOrder: 3 },
    { key: "trending", title: "Trending Now", subtitle: "What Nepal is buying this week", enabled: true, sortOrder: 4 },
    { key: "best_sellers", title: "Best Sellers", subtitle: "", enabled: true, sortOrder: 5 },
    { key: "new_arrivals", title: "New Arrivals", subtitle: "", enabled: true, sortOrder: 6 },
    { key: "recommended", title: "Recommended For You", subtitle: "Handpicked just for you", enabled: true, sortOrder: 7 },
    { key: "brands", title: "Popular Brands", subtitle: "", enabled: true, sortOrder: 8 },
    { key: "local_sellers", title: "Local Nepal Sellers", subtitle: "Shop direct from verified local vendors", enabled: true, sortOrder: 9 },
    { key: "newsletter", title: "Never Miss a Deal", subtitle: "Get exclusive coupons and flash sale alerts.", enabled: true, sortOrder: 10 },
  ]);

  await db.insert(s.banners).values([
    { title: "Dashain Shopping Festival", subtitle: "Up to 50% off on electronics and fashion", image: "/images/banner-dashain.jpg", color: "#f59e0b", position: "hero", sortOrder: 1 },
    { title: "Free Delivery in Kathmandu", subtitle: "On orders over Rs. 2000 — today only", image: "/images/banner-delivery.jpg", color: "#0ea5e9", position: "promo", sortOrder: 1 },
    { title: "Fresh Groceries Daily", subtitle: "Same-day delivery in the Valley", image: "/images/banner-grocery.jpg", color: "#22c55e", position: "promo", sortOrder: 2 },
  ]);

  await db.insert(s.settings).values([
    { key: "autoApproveProducts", value: { enabled: false } },
    { key: "defaultCommission", value: { percent: 10 } },
    { key: "platformName", value: { name: "Bazzaro" } },
  ]);

  await seedMedia();

  console.log("Seed complete.");
  console.log("  Admin:   admin@bazzaro.com  / Admin@1234");
  console.log("  Vendor:  vendor@hulak.com / Vendor@1234 (approved)");
  console.log("  Customer: customer@bazzaro.com / Customer@1234");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
