import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["customer", "vendor", "admin"]);
export const adminTierEnum = pgEnum("admin_tier", [
  "super_admin",
  "product_admin",
  "order_admin",
  "finance_admin",
  "vendor_manager",
  "support_agent",
]);
export const vendorStatusEnum = pgEnum("vendor_status", ["pending", "approved", "rejected"]);
export const productStatusEnum = pgEnum("product_status", ["pending", "approved", "rejected", "archived"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "payment_failed",
  "payment_verified",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "esewa", "khalti"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified", "failed", "refunded"]);
export const txnStatusEnum = pgEnum("txn_status", ["pending", "verified", "failed", "refunded", "cancelled"]);
export const inventoryTxnTypeEnum = pgEnum("inventory_txn_type", [
  "restock",
  "adjustment",
  "sale",
  "reservation",
  "release",
  "return",
]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);
export const couponScopeEnum = pgEnum("coupon_scope", ["all", "category", "product", "vendor"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "requested",
  "approved",
  "processing",
  "paid",
  "rejected",
]);
export const vendorTxnTypeEnum = pgEnum("vendor_txn_type", [
  "sale",
  "commission",
  "refund",
  "adjustment",
  "withdrawal",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
]);
export const ticketCategoryEnum = pgEnum("ticket_category", [
  "payment",
  "order",
  "delivery",
  "return",
  "refund",
  "product",
  "account",
  "other",
]);
export const returnStatusEnum = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "picked",
  "refunded",
]);
export const deliveryMethodEnum = pgEnum("delivery_method", ["standard", "express", "same_day", "pickup"]);

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    adminTier: adminTierEnum("admin_tier"),
    avatarColor: text("avatar_color").notNull().default("#f59e0b"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    recipient: text("recipient").notNull(),
    phone: text("phone").notNull(),
    province: text("province").notNull(),
    district: text("district").notNull(),
    city: text("city").notNull(),
    ward: text("ward"),
    street: text("street").notNull(),
    landmark: text("landmark"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon").notNull().default("Package"),
    color: text("color").notNull().default("#0ea5e9"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#f59e0b"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("brands_slug_unique").on(t.slug)],
);

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopName: text("shop_name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    logoColor: text("logo_color").notNull().default("#f59e0b"),
    status: vendorStatusEnum("status").notNull().default("pending"),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("10"),
    businessName: text("business_name"),
    panVatNumber: text("pan_vat_number"),
    kycDocumentUrl: text("kyc_document_url"),
    bankName: text("bank_name"),
    bankAccount: text("bank_account"),
    bankHolder: text("bank_holder"),
    rejectedReason: text("rejected_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("vendors_slug_unique").on(t.slug),
    uniqueIndex("vendors_user_unique").on(t.userId),
    index("vendors_status_idx").on(t.status),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    price: integer("price").notNull().default(0),
    salePrice: integer("sale_price"),
    costPrice: integer("cost_price"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    stock: integer("stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    weightGrams: integer("weight_grams").notNull().default(0),
    warranty: text("warranty"),
    returnPolicy: text("return_policy"),
    tags: text("tags").array().notNull().default([]),
    status: productStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    soldCount: integer("sold_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    uniqueIndex("products_sku_unique").on(t.sku),
    index("products_status_idx").on(t.status),
    index("products_vendor_idx").on(t.vendorId),
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
    index("products_created_idx").on(t.createdAt),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVideos = pgTable(
  "product_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
  },
  (t) => [index("product_videos_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    size: text("size"),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    price: integer("price"),
    stock: integer("stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    weightGrams: integer("weight_grams").notNull().default(0),
    imageColor: text("image_color"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("product_variants_sku_unique").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
  ],
);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    type: inventoryTxnTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("inventory_txn_product_idx").on(t.productId)],
);

// ---------------------------------------------------------------------------
// Cart & wishlist
// ---------------------------------------------------------------------------
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestToken: text("guest_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("carts_user_unique").on(t.userId), index("carts_guest_idx").on(t.guestToken)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cart_items_unique").on(t.cartId, t.productId, t.variantId),
    index("cart_items_cart_idx").on(t.cartId),
  ],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("wishlist_unique").on(t.userId, t.productId), index("wishlist_user_idx").on(t.userId)],
);

export const recentlyViewed = pgTable(
  "recently_viewed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("recently_viewed_unique").on(t.userId, t.productId), index("recently_viewed_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  districts: text("districts").array().notNull().default([]),
  fee: integer("fee").notNull().default(0),
  freeThreshold: integer("free_threshold").notNull().default(0),
  estDaysMin: integer("est_days_min").notNull().default(2),
  estDaysMax: integer("est_days_max").notNull().default(4),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  expressEnabled: boolean("express_enabled").notNull().default(false),
  sameDayEnabled: boolean("same_day_enabled").notNull().default(false),
  pickupEnabled: boolean("pickup_enabled").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Orders & payments
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    addressSnapshot: jsonb("address_snapshot").notNull(),
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    deliveryMethod: text("delivery_method").notNull().default("standard"),
    customerNote: text("customer_note"),
    subtotal: integer("subtotal").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    grandTotal: integer("grand_total").notNull().default(0),
    couponId: uuid("coupon_id"),
    couponCode: text("coupon_code"),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    returnReason: text("return_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_number_unique").on(t.orderNumber),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    nameSnapshot: text("name_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    color: text("color"),
    size: text("size"),
    imageColor: text("image_color"),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    amount: integer("amount").notNull(),
    status: txnStatusEnum("status").notNull().default("pending"),
    transactionId: text("transaction_id"),
    gatewayRef: text("gateway_ref"),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("payments_txn_unique").on(t.transactionId),
    index("payments_order_idx").on(t.orderId),
  ],
);

// ---------------------------------------------------------------------------
// Coupons, flash sales, promotions
// ---------------------------------------------------------------------------
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    description: text("description"),
    type: couponTypeEnum("type").notNull(),
    value: integer("value").notNull(),
    minOrderAmount: integer("min_order_amount").notNull().default(0),
    maxDiscount: integer("max_discount"),
    usageLimit: integer("usage_limit"),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    scope: couponScopeEnum("scope").notNull().default("all"),
    categoryIds: uuid("category_ids").array().notNull().default([]),
    productIds: uuid("product_ids").array().notNull().default([]),
    vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "cascade" }),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    freeDelivery: boolean("free_delivery").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coupons_code_unique").on(t.code)],
);

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    discount: integer("discount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coupon_usage_unique").on(t.couponId, t.userId), index("coupon_usages_coupon_idx").on(t.couponId)],
);

export const flashSales = pgTable("flash_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const flashSaleProducts = pgTable(
  "flash_sale_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flashSaleId: uuid("flash_sale_id")
      .notNull()
      .references(() => flashSales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    discountPercent: integer("discount_percent").notNull().default(10),
    stockLimit: integer("stock_limit").notNull().default(100),
    soldCount: integer("sold_count").notNull().default(0),
  },
  (t) => [uniqueIndex("flash_sale_product_unique").on(t.flashSaleId, t.productId)],
);

// ---------------------------------------------------------------------------
// Reviews & returns
// ---------------------------------------------------------------------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    comment: text("comment"),
    images: text("images").array().notNull().default([]),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    adminHidden: boolean("admin_hidden").notNull().default(false),
    vendorReply: text("vendor_reply"),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reviews_unique").on(t.productId, t.userId), index("reviews_product_idx").on(t.productId)],
);

export const returns = pgTable(
  "returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    evidenceNote: text("evidence_note"),
    status: returnStatusEnum("status").notNull().default("requested"),
    resolutionNote: text("resolution_note"),
    refundAmount: integer("refund_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("returns_order_idx").on(t.orderId), index("returns_vendor_idx").on(t.vendorId)],
);

// ---------------------------------------------------------------------------
// Vendor wallet & withdrawals
// ---------------------------------------------------------------------------
export const vendorTransactions = pgTable(
  "vendor_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: vendorTxnTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull().default(0),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("vendor_txn_vendor_idx").on(t.vendorId)],
);

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    status: withdrawalStatusEnum("status").notNull().default("requested"),
    note: text("note"),
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("withdrawals_vendor_idx").on(t.vendorId)],
);

// ---------------------------------------------------------------------------
// Notifications & support
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("general"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: text("ticket_number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    category: text("category").notNull().default("other"),
    subject: text("subject").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("support_tickets_number_unique").on(t.ticketNumber),
    index("support_tickets_user_idx").on(t.userId),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    isStaff: boolean("is_staff").notNull().default(false),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId)],
);

// ---------------------------------------------------------------------------
// CMS / platform
// ---------------------------------------------------------------------------
export const banners = pgTable(
  "banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    image: text("image"),
    color: text("color").notNull().default("#f59e0b"),
    linkHref: text("link_href"),
    position: text("position").notNull().default("hero"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("banners_position_idx").on(t.position)],
);

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("homepage_sections_key_unique").on(t.key)],
);

// Uploaded media is always tied to an authenticated actor. Files live in
// Cloudinary in production or on the local volume in preview/development.
export const mediaUploads = pgTable(
  "media_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    purpose: text("purpose").notNull(), // product | banner
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("media_uploads_url_unique").on(t.url), index("media_uploads_owner_idx").on(t.ownerId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    meta: jsonb("meta").default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);
