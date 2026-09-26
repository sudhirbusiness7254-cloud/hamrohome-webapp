import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { transitionOrder, resolveReturn } from "@/lib/order-service";
import { notify, audit } from "@/lib/notify";
import { slugify } from "@/lib/format";
import { createCatalogProduct, updateCatalogProduct } from "@/lib/catalog-management";

type Ctx = { params: Promise<{ resource: string }> };

async function vendorContext(userId: string) {
  const v = await db.select().from(s.vendors).where(eq(s.vendors.userId, userId)).limit(1);
  return v[0] ?? null;
}

async function walletBalance(vendorId: string) {
  const r = await db.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, vendorId));
  return r[0]?.n ?? 0;
}

async function pendingBalance(vendorId: string, rate: number) {
  // gross share in orders not yet delivered/cancelled/refunded
  const rows = await db
    .select({ subtotal: s.orderItems.subtotal, status: s.orders.status })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
    .innerJoin(s.products, eq(s.orderItems.productId, s.products.id))
    .where(and(eq(s.products.vendorId, vendorId), inArray(s.orders.status, ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "payment_verified"])));
  const gross = rows.reduce((a, r) => a + r.subtotal, 0);
  return Math.round((gross * (100 - rate)) / 100);
}

// ---------------------------------------------------------------- GET
export async function GET(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "vendor") return fail("Vendor account required", 403, "FORBIDDEN");
  const q = req.nextUrl.searchParams;
  const vendor = await vendorContext(auth.user.id);

  if (resource === "status") {
    return ok({ vendor });
  }

  if (!vendor) return fail("Vendor profile not found. Please register your shop.", 404, "NO_VENDOR");
  const rate = Number(vendor.commissionRate ?? 10);

  if (resource === "dashboard") {
    const [rev, orderCount, prodCount, pendingOrders, lowStock, recentTxns] = await Promise.all([
      db.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(and(eq(s.vendorTransactions.vendorId, auth.user.id), eq(s.vendorTransactions.type, "sale"))),
      db.select({ n: sql<number>`count(DISTINCT ${s.orders.id})::int` }).from(s.orders).innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id)).innerJoin(s.products, eq(s.orderItems.productId, s.products.id)).where(eq(s.products.vendorId, auth.user.id)),
      db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.vendorId, auth.user.id)),
      db.select({ n: sql<number>`count(DISTINCT ${s.orders.id})::int` }).from(s.orders).innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id)).innerJoin(s.products, eq(s.orderItems.productId, s.products.id)).where(and(eq(s.products.vendorId, auth.user.id), inArray(s.orders.status, ["confirmed", "processing", "packed"]))),
      db.select({ id: s.products.id, name: s.products.name, slug: s.products.slug, stock: s.products.stock, reservedStock: s.products.reservedStock, lowStockThreshold: s.products.lowStockThreshold })
        .from(s.products).where(and(eq(s.products.vendorId, auth.user.id), sql`${s.products.stock} - ${s.products.reservedStock} <= ${s.products.lowStockThreshold}`)).limit(8),
      db.select().from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, auth.user.id)).orderBy(desc(s.vendorTransactions.createdAt)).limit(6),
    ]);
    const recentOrders = await db.select({
      id: s.orders.id, orderNumber: s.orders.orderNumber, status: s.orders.status,
      grandTotal: s.orders.grandTotal, createdAt: s.orders.createdAt,
      share: sql<number>`COALESCE(SUM(${s.orderItems.subtotal}),0)::int`,
    })
      .from(s.orders)
      .innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
      .innerJoin(s.products, eq(s.orderItems.productId, s.products.id))
      .where(eq(s.products.vendorId, auth.user.id))
      .groupBy(s.orders.id)
      .orderBy(desc(s.orders.createdAt))
      .limit(6);
    const daily = await db.select({
      day: sql<string>`to_char(${s.vendorTransactions.createdAt}, 'YYYY-MM-DD')`,
      n: sql<number>`SUM(CASE WHEN ${s.vendorTransactions.type} = 'sale' THEN ${s.vendorTransactions.amount} ELSE 0 END)::int`,
    })
      .from(s.vendorTransactions)
      .where(and(eq(s.vendorTransactions.vendorId, auth.user.id), sql`${s.vendorTransactions.createdAt} >= NOW() - INTERVAL '14 days'`))
      .groupBy(sql`to_char(${s.vendorTransactions.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${s.vendorTransactions.createdAt}, 'YYYY-MM-DD')`);
    const balance = await walletBalance(auth.user.id);
    const pending = await pendingBalance(auth.user.id, rate);
    return ok({
      vendor, stats: {
        revenue: rev[0]?.n ?? 0, orders: orderCount[0]?.n ?? 0, products: prodCount[0]?.n ?? 0,
        pendingOrders: pendingOrders[0]?.n ?? 0, balance, pending,
      },
      lowStock, recentOrders, recentTxns, daily,
    });
  }

  if (resource === "products") {
    const rows = await db.select({
      product: s.products, categoryName: s.categories.name, brandName: s.brands.name,
    })
      .from(s.products)
      .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
      .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
      .where(eq(s.products.vendorId, auth.user.id))
      .orderBy(desc(s.products.createdAt));
    const withVariants = await Promise.all(rows.map(async (r) => {
      const [vs, images] = await Promise.all([
        db.select().from(s.productVariants).where(eq(s.productVariants.productId, r.product.id)),
        db.select().from(s.productImages).where(eq(s.productImages.productId, r.product.id)).orderBy(s.productImages.sortOrder),
      ]);
      return { ...r.product, categoryName: r.categoryName, brandName: r.brandName, variants: vs.filter((v) => v.isActive), images };
    }));
    const [cats, brands] = await Promise.all([
      db.select().from(s.categories).where(eq(s.categories.isActive, true)).orderBy(s.categories.sortOrder),
      db.select().from(s.brands).orderBy(s.brands.name),
    ]);
    return ok({ products: withVariants, categories: cats, brands });
  }

  if (resource === "orders") {
    const status = q.get("status");
    const orderIds = await db.selectDistinct({ id: s.orders.id })
      .from(s.orders)
      .innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
      .innerJoin(s.products, eq(s.orderItems.productId, s.products.id))
      .where(eq(s.products.vendorId, auth.user.id))
      .orderBy(desc(s.orders.createdAt))
      .limit(100);
    const ids = orderIds.map((o) => o.id);
    if (ids.length === 0) return ok({ orders: [] });
    const rows = await db.select().from(s.orders).where(inArray(s.orders.id, ids)).orderBy(desc(s.orders.createdAt));
    const filtered = status ? rows.filter((r) => r.status === status) : rows;
    const withItems = await Promise.all(filtered.map(async (o) => {
      const items = await db.select({ item: s.orderItems })
        .from(s.orderItems)
        .innerJoin(s.products, eq(s.orderItems.productId, s.products.id))
        .where(and(eq(s.orderItems.orderId, o.id), eq(s.products.vendorId, auth.user.id)));
      const addr = o.addressSnapshot as { recipient?: string; phone?: string; district?: string; city?: string };
      return { ...o, myItems: items.map((i) => i.item), shipTo: addr };
    }));
    return ok({ orders: withItems });
  }

  if (resource === "returns") {
    const rows = await db.select({
      ret: s.returns, orderNumber: s.orders.orderNumber, orderStatus: s.orders.status,
      customer: s.users.name, itemName: s.orderItems.nameSnapshot,
      itemQty: s.orderItems.quantity, itemSubtotal: s.orderItems.subtotal,
    })
      .from(s.returns)
      .innerJoin(s.orders, eq(s.returns.orderId, s.orders.id))
      .innerJoin(s.orderItems, eq(s.returns.orderItemId, s.orderItems.id))
      .innerJoin(s.users, eq(s.returns.userId, s.users.id))
      .where(eq(s.returns.vendorId, auth.user.id))
      .orderBy(desc(s.returns.createdAt));
    return ok({ returns: rows });
  }

  if (resource === "reviews") {
    const rows = await db.select({
      review: s.reviews, productName: s.products.name, productSlug: s.products.slug, userName: s.users.name,
    })
      .from(s.reviews)
      .innerJoin(s.products, eq(s.reviews.productId, s.products.id))
      .innerJoin(s.users, eq(s.reviews.userId, s.users.id))
      .where(eq(s.products.vendorId, auth.user.id))
      .orderBy(desc(s.reviews.createdAt))
      .limit(100);
    return ok({ reviews: rows });
  }

  if (resource === "wallet") {
    const [txns, wds] = await Promise.all([
      db.select().from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, auth.user.id)).orderBy(desc(s.vendorTransactions.createdAt)).limit(50),
      db.select().from(s.withdrawals).where(eq(s.withdrawals.vendorId, auth.user.id)).orderBy(desc(s.withdrawals.createdAt)).limit(20),
    ]);
    const balance = await walletBalance(auth.user.id);
    const pending = await pendingBalance(auth.user.id, rate);
    return ok({ balance, pending, txns, withdrawals: wds, commissionRate: rate });
  }

  if (resource === "withdrawals") {
    const wds = await db.select().from(s.withdrawals).where(eq(s.withdrawals.vendorId, auth.user.id)).orderBy(desc(s.withdrawals.createdAt));
    const balance = await walletBalance(auth.user.id);
    return ok({ withdrawals: wds, balance });
  }

  if (resource === "settings") {
    return ok({ vendor });
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- POST
export async function POST(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (resource === "register") {
    const schema = z.object({
      shopName: z.string().min(3).max(120),
      description: z.string().max(1000).optional(),
      businessName: z.string().max(160).optional(),
      panVatNumber: z.string().max(40).optional(),
      bankName: z.string().max(120).optional(),
      bankAccount: z.string().max(60).optional(),
      bankHolder: z.string().max(120).optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (auth.user.role === "admin") return fail("Admins cannot register as vendors", 400, "BAD_ROLE");
    const ex = await vendorContext(auth.user.id);
    if (ex) return fail("You already have a shop application", 409, "ALREADY_VENDOR");
    let slug = slugify(p.data.shopName);
    const taken = await db.select({ id: s.vendors.id }).from(s.vendors).where(eq(s.vendors.slug, slug)).limit(1);
    if (taken[0]) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const [v] = await db.insert(s.vendors).values({
      userId: auth.user.id, shopName: p.data.shopName.trim(), slug,
      description: p.data.description?.trim() || null, status: "pending",
      businessName: p.data.businessName?.trim() || null, panVatNumber: p.data.panVatNumber?.trim() || null,
      bankName: p.data.bankName?.trim() || null, bankAccount: p.data.bankAccount?.trim() || null, bankHolder: p.data.bankHolder?.trim() || null,
    }).returning();
    await db.update(s.users).set({ role: "vendor" }).where(eq(s.users.id, auth.user.id));
    const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
    for (const a of admins) await notify(a.id, "vendor", "New vendor application", `${v.shopName} is waiting for review.`, `/admin?tab=vendors`);
    await notify(auth.user.id, "vendor", "Application received", "Your shop is under review. We will notify you soon.", `/vendor`);
    await audit(auth.user.id, auth.user.name, "vendor.register", "vendor", v.id, { shop: v.shopName }, clientIp(req));
    return ok({ vendor: v }, 201);
  }

  if (auth.user.role !== "vendor") return fail("Vendor account required", 403, "FORBIDDEN");
  const vendor = await vendorContext(auth.user.id);
  if (!vendor) return fail("Vendor profile not found", 404, "NO_VENDOR");
  if (vendor.status !== "approved" && (resource === "products" || resource === "orders")) {
    return fail("Your shop is pending approval", 403, "VENDOR_PENDING");
  }

  if (resource === "products") {
    try {
      const product = await createCatalogProduct(b.value, {
        id: auth.user.id, name: auth.user.name, role: "vendor", ip: clientIp(req),
      });
      return ok({ product }, 201);
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message || "Could not submit product", err.status ?? 500, err.code ?? "PRODUCT_FAILED");
    }
  }

  if (resource === "returns") {
    const schema = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]), note: z.string().max(500).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const r = await db.select().from(s.returns).where(eq(s.returns.id, p.data.id)).limit(1);
    if (!r[0] || r[0].vendorId !== auth.user.id) return fail("Return not found", 404, "NOT_FOUND");
    try {
      const ret = await resolveReturn({ returnId: p.data.id, action: p.data.action, actorId: auth.user.id, actorName: auth.user.name, note: p.data.note, ip: clientIp(req) });
      return ok({ ret });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message, err.status || 500, err.code || "RETURN_FAILED");
    }
  }

  if (resource === "withdrawals") {
    const schema = z.object({ amount: z.number().int().min(100) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Minimum withdrawal is Rs. 100", 422, "VALIDATION_ERROR", p.error.issues);
    const balance = await walletBalance(auth.user.id);
    if (p.data.amount > balance) return fail(`Insufficient balance (Rs. ${balance.toLocaleString()} available)`, 400, "INSUFFICIENT");
    const [w] = await db.insert(s.withdrawals).values({ vendorId: auth.user.id, amount: p.data.amount, status: "requested" }).returning();
    const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
    for (const a of admins) await notify(a.id, "withdrawal", "New withdrawal request", `${vendor.shopName} requested Rs. ${p.data.amount.toLocaleString()}`, `/admin?tab=withdrawals`);
    await audit(auth.user.id, auth.user.name, "withdrawal.request", "withdrawal", w.id, { amount: p.data.amount }, clientIp(req));
    return ok({ withdrawal: w }, 201);
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- PATCH
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "vendor") return fail("Vendor account required", 403, "FORBIDDEN");
  const vendor = await vendorContext(auth.user.id);
  if (!vendor) return fail("Vendor profile not found", 404, "NO_VENDOR");
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (resource === "products") {
    const id = typeof b.value.id === "string" ? b.value.id : "";
    if (!id) return fail("Product required", 400, "BAD_REQUEST");
    if (vendor.status !== "approved") return fail("Your shop is pending approval", 403, "VENDOR_PENDING");
    try {
      const product = await updateCatalogProduct(id, b.value, {
        id: auth.user.id, name: auth.user.name, role: "vendor", ip: clientIp(req),
      });
      return ok({ product });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message || "Could not update product", err.status ?? 500, err.code ?? "PRODUCT_FAILED");
    }
  }

  if (resource === "orders") {
    const schema = z.object({ id: z.string().uuid(), status: z.enum(["processing", "packed", "shipped"]) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const mine = await db.select({ id: s.orderItems.id })
      .from(s.orderItems).innerJoin(s.products, eq(s.orderItems.productId, s.products.id))
      .where(and(eq(s.orderItems.orderId, p.data.id), eq(s.products.vendorId, auth.user.id))).limit(1);
    if (!mine[0]) return fail("Order not found", 404, "NOT_FOUND");
    try {
      const order = await transitionOrder(p.data.id, p.data.status, auth.user.id, auth.user.name, `Updated by ${vendor.shopName}`, clientIp(req));
      return ok({ order });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message, err.status || 500, err.code || "ORDER_FAILED");
    }
  }

  if (resource === "settings") {
    const schema = z.object({
      shopName: z.string().min(3).max(120).optional(),
      description: z.string().max(1000).nullable().optional(),
      logoColor: z.string().max(20).optional(),
      businessName: z.string().max(160).nullable().optional(),
      panVatNumber: z.string().max(40).nullable().optional(),
      bankName: z.string().max(120).nullable().optional(),
      bankAccount: z.string().max(60).nullable().optional(),
      bankHolder: z.string().max(120).nullable().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const patch: Partial<typeof s.vendors.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["shopName", "description", "logoColor", "businessName", "panVatNumber", "bankName", "bankAccount", "bankHolder"] as const) {
      if (p.data[k] !== undefined) (patch as Record<string, unknown>)[k] = p.data[k];
    }
    const [u] = await db.update(s.vendors).set(patch).where(eq(s.vendors.id, vendor.id)).returning();
    return ok({ vendor: u });
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- DELETE
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "vendor") return fail("Vendor account required", 403, "FORBIDDEN");
  if (resource !== "products") return fail("Not found", 404, "NOT_FOUND");
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("Product required", 400, "BAD_REQUEST");
  const rows = await db.select().from(s.products).where(and(eq(s.products.id, id), eq(s.products.vendorId, auth.user.id))).limit(1);
  if (!rows[0]) return fail("Product not found", 404, "NOT_FOUND");
  await db.update(s.products).set({ status: "archived", updatedAt: new Date() }).where(eq(s.products.id, id));
  await audit(auth.user.id, auth.user.name, "product.archive", "product", id, {}, clientIp(req));
  return ok({ done: true });
}
