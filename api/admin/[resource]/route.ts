import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { canAccess } from "@/lib/auth";
import { transitionOrder, resolveReturn } from "@/lib/order-service";
import { notify, audit } from "@/lib/notify";
import { slugify } from "@/lib/format";
import { createCatalogProduct, updateCatalogProduct } from "@/lib/catalog-management";
import { hasProductPhoto, validateBannerPhoto } from "@/lib/media";

type Ctx = { params: Promise<{ resource: string }> };

const AREA: Record<string, string> = {
  dashboard: "analytics", users: "customers", vendors: "vendors", products: "products",
  orders: "orders", returns: "refunds", coupons: "coupons", delivery: "orders",
  withdrawals: "withdrawals", settings: "settings", sections: "sections", banners: "sections",
  "audit-logs": "audit", catalog: "products", promos: "coupons",
};

async function guard(resource: string) {
  const auth = await requireUser();
  if ("response" in auth) return { error: auth.response as ReturnType<typeof fail> extends never ? never : import("next/server").NextResponse };
  if (auth.user.role !== "admin") return { error: fail("Admin access required", 403, "FORBIDDEN") };
  if (!canAccess(auth.user, AREA[resource] ?? resource)) return { error: fail("Your admin role cannot access this area", 403, "FORBIDDEN") };
  return { user: auth.user };
}

// ---------------------------------------------------------------- GET
export async function GET(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const g = await guard(resource);
  if ("error" in g) return g.error;
  const q = req.nextUrl.searchParams;

  if (resource === "dashboard") {
    const delivered = eq(s.orders.status, "delivered");
    const [sales, today, month, orders, pending, customers, vendors, vendorsPending, products, productsPending, commission, refunds, wdPending, lowStock] = await Promise.all([
      db.select({ n: sql<number>`COALESCE(SUM(grand_total),0)::int` }).from(s.orders).where(delivered),
      db.select({ n: sql<number>`COALESCE(SUM(grand_total),0)::int` }).from(s.orders).where(and(delivered, sql`DATE(${s.orders.createdAt}) = CURRENT_DATE`)),
      db.select({ n: sql<number>`COALESCE(SUM(grand_total),0)::int` }).from(s.orders).where(and(delivered, sql`DATE_TRUNC('month', ${s.orders.createdAt}) = DATE_TRUNC('month', NOW())`)),
      db.select({ n: sql<number>`count(*)::int` }).from(s.orders),
      db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(inArray(s.orders.status, ["pending_payment", "confirmed", "processing", "packed"])),
      db.select({ n: sql<number>`count(*)::int` }).from(s.users).where(eq(s.users.role, "customer")),
      db.select({ n: sql<number>`count(*)::int` }).from(s.vendors),
      db.select({ n: sql<number>`count(*)::int` }).from(s.vendors).where(eq(s.vendors.status, "pending")),
      db.select({ n: sql<number>`count(*)::int` }).from(s.products),
      db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.status, "pending")),
      db.select({ n: sql<number>`COALESCE(SUM(-amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.type, "commission")),
      db.select({ n: sql<number>`count(*)::int` }).from(s.returns).where(eq(s.returns.status, "refunded")),
      db.select({ n: sql<number>`count(*)::int` }).from(s.withdrawals).where(eq(s.withdrawals.status, "requested")),
      db.select({ id: s.products.id, name: s.products.name, slug: s.products.slug, stock: s.products.stock, reservedStock: s.products.reservedStock })
        .from(s.products).where(and(eq(s.products.status, "approved"), sql`${s.products.stock} - ${s.products.reservedStock} <= ${s.products.lowStockThreshold}`)).limit(10),
    ]);
    const daily = await db.select({
      day: sql<string>`to_char(${s.orders.createdAt}, 'MM-DD')`,
      sales: sql<number>`COALESCE(SUM(${s.orders.grandTotal}),0)::int`,
      orders: sql<number>`count(*)::int`,
    }).from(s.orders).where(and(delivered, sql`${s.orders.createdAt} >= NOW() - INTERVAL '14 days'`))
      .groupBy(sql`to_char(${s.orders.createdAt}, 'MM-DD')`).orderBy(sql`to_char(${s.orders.createdAt}, 'MM-DD')`);
    const topProducts = await db.select({ name: s.products.name, slug: s.products.slug, soldCount: s.products.soldCount }).from(s.products).orderBy(desc(s.products.soldCount)).limit(5);
    const topVendors = await db.select({ shop: s.vendors.shopName, n: sql<number>`SUM(${s.vendorTransactions.amount})::int` })
      .from(s.vendorTransactions).innerJoin(s.vendors, eq(s.vendorTransactions.vendorId, s.vendors.userId))
      .where(eq(s.vendorTransactions.type, "sale")).groupBy(s.vendors.shopName).orderBy(sql`SUM(${s.vendorTransactions.amount}) DESC`).limit(5);
    const topCats = await db.select({ name: s.categories.name, n: sql<number>`SUM(${s.products.soldCount})::int` })
      .from(s.products).innerJoin(s.categories, eq(s.products.categoryId, s.categories.id))
      .groupBy(s.categories.name).orderBy(sql`SUM(${s.products.soldCount}) DESC`).limit(5);
    return ok({
      metrics: {
        totalSales: sales[0]?.n ?? 0, todaySales: today[0]?.n ?? 0, monthSales: month[0]?.n ?? 0,
        totalOrders: orders[0]?.n ?? 0, pendingOrders: pending[0]?.n ?? 0,
        customers: customers[0]?.n ?? 0, vendors: vendors[0]?.n ?? 0, vendorsPending: vendorsPending[0]?.n ?? 0,
        products: products[0]?.n ?? 0, productsPending: productsPending[0]?.n ?? 0,
        commission: commission[0]?.n ?? 0, refunds: refunds[0]?.n ?? 0, withdrawalsPending: wdPending[0]?.n ?? 0,
      },
      daily, topProducts, topVendors, topCats, lowStock,
    });
  }

  if (resource === "users") {
    const role = q.get("role");
    const term = (q.get("q") || "").trim();
    const page = Math.max(1, Number(q.get("page") || 1));
    const conds = [];
    if (role && ["customer", "vendor", "admin"].includes(role)) conds.push(eq(s.users.role, role as "customer" | "vendor" | "admin"));
    if (term) conds.push(or(ilike(s.users.name, `%${term}%`), ilike(s.users.email, `%${term}%`))!);
    const where = conds.length ? and(...conds) : undefined;
    const [total, rows] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(s.users).where(where),
      db.select({ id: s.users.id, name: s.users.name, email: s.users.email, phone: s.users.phone, role: s.users.role, adminTier: s.users.adminTier, createdAt: s.users.createdAt })
        .from(s.users).where(where).orderBy(desc(s.users.createdAt)).limit(20).offset((page - 1) * 20),
    ]);
    return ok({ users: rows, total: total[0]?.n ?? 0, page });
  }

  if (resource === "vendors") {
    const status = q.get("status");
    const rows = await db.select({ vendor: s.vendors, owner: s.users.name, email: s.users.email })
      .from(s.vendors).innerJoin(s.users, eq(s.vendors.userId, s.users.id))
      .orderBy(desc(s.vendors.createdAt)).limit(100);
    const list = status ? rows.filter((r) => r.vendor.status === status) : rows;
    const withStats = await Promise.all(list.map(async (r) => {
      const [pc, bal] = await Promise.all([
        db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.vendorId, r.vendor.userId)),
        db.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, r.vendor.userId)),
      ]);
      return { ...r, productCount: pc[0]?.n ?? 0, balance: bal[0]?.n ?? 0 };
    }));
    return ok({ vendors: withStats });
  }

  if (resource === "products") {
    const status = q.get("status");
    const term = (q.get("q") || "").trim();
    const page = Math.max(1, Number(q.get("page") || 1));
    const conds = [];
    if (status) conds.push(eq(s.products.status, status as typeof s.products.$inferSelect.status));
    if (term) conds.push(or(ilike(s.products.name, `%${term}%`), ilike(s.products.sku, `%${term}%`))!);
    const where = conds.length ? and(...conds) : undefined;
    const [total, rows] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(where),
      db.select({ product: s.products, shopName: s.vendors.shopName, categoryName: s.categories.name })
        .from(s.products).leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId))
        .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
        .where(where).orderBy(desc(s.products.createdAt)).limit(20).offset((page - 1) * 20),
    ]);
    const [categories, brands, sellers, fullRows] = await Promise.all([
      db.select({ id: s.categories.id, name: s.categories.name, slug: s.categories.slug }).from(s.categories).where(eq(s.categories.isActive, true)).orderBy(s.categories.sortOrder),
      db.select({ id: s.brands.id, name: s.brands.name, slug: s.brands.slug }).from(s.brands).orderBy(s.brands.name),
      db.select({ userId: s.vendors.userId, shopName: s.vendors.shopName, slug: s.vendors.slug }).from(s.vendors).where(eq(s.vendors.status, "approved")).orderBy(s.vendors.shopName),
      Promise.all(rows.map(async (row) => {
        const [images, variants] = await Promise.all([
          db.select().from(s.productImages).where(eq(s.productImages.productId, row.product.id)).orderBy(s.productImages.sortOrder),
          db.select().from(s.productVariants).where(and(eq(s.productVariants.productId, row.product.id), eq(s.productVariants.isActive, true))),
        ]);
        return { ...row, product: { ...row.product, images, variants } };
      })),
    ]);
    return ok({ products: fullRows, categories, brands, sellers, total: total[0]?.n ?? 0, page });
  }

  if (resource === "orders") {
    const id = q.get("id");
    if (id) {
      const o = await db.select().from(s.orders).where(eq(s.orders.id, id)).limit(1);
      if (!o[0]) return fail("Order not found", 404, "NOT_FOUND");
      const [items, history, payment, user] = await Promise.all([
        db.select({ item: s.orderItems, shopName: s.vendors.shopName })
          .from(s.orderItems).leftJoin(s.products, eq(s.orderItems.productId, s.products.id))
          .leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId)).where(eq(s.orderItems.orderId, id)),
        db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, id)).orderBy(s.orderStatusHistory.createdAt),
        db.select().from(s.payments).where(eq(s.payments.orderId, id)).orderBy(desc(s.payments.createdAt)),
        db.select({ name: s.users.name, email: s.users.email, phone: s.users.phone }).from(s.users).where(eq(s.users.id, o[0].userId)).limit(1),
      ]);
      return ok({ order: o[0], items, history, payments: payment, customer: user[0] ?? null });
    }
    const status = q.get("status");
    const term = (q.get("q") || "").trim();
    const page = Math.max(1, Number(q.get("page") || 1));
    const conds = [];
    if (status) conds.push(eq(s.orders.status, status as typeof s.orders.$inferSelect.status));
    if (term) conds.push(ilike(s.orders.orderNumber, `%${term}%`));
    const where = conds.length ? and(...conds) : undefined;
    const [total, rows] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(where),
      db.select({ order: s.orders, customer: s.users.name })
        .from(s.orders).innerJoin(s.users, eq(s.orders.userId, s.users.id))
        .where(where).orderBy(desc(s.orders.createdAt)).limit(20).offset((page - 1) * 20),
    ]);
    return ok({ orders: rows, total: total[0]?.n ?? 0, page });
  }

  if (resource === "returns") {
    const status = q.get("status");
    const rows = await db.select({
      ret: s.returns, orderNumber: s.orders.orderNumber, orderStatus: s.orders.status,
      customer: s.users.name, itemName: s.orderItems.nameSnapshot, itemSubtotal: s.orderItems.subtotal,
      shopName: s.vendors.shopName,
    })
      .from(s.returns).innerJoin(s.orders, eq(s.returns.orderId, s.orders.id))
      .innerJoin(s.orderItems, eq(s.returns.orderItemId, s.orderItems.id))
      .innerJoin(s.users, eq(s.returns.userId, s.users.id))
      .leftJoin(s.vendors, eq(s.returns.vendorId, s.vendors.userId))
      .orderBy(desc(s.returns.createdAt)).limit(100);
    return ok({ returns: status ? rows.filter((r) => r.ret.status === status) : rows });
  }

  if (resource === "coupons") {
    const rows = await db.select().from(s.coupons).orderBy(desc(s.coupons.createdAt));
    const withUsage = await Promise.all(rows.map(async (c) => {
      const u = await db.select({ n: sql<number>`count(*)::int` }).from(s.couponUsages).where(eq(s.couponUsages.couponId, c.id));
      return { ...c, usedCount: u[0]?.n ?? 0 };
    }));
    return ok({ coupons: withUsage });
  }

  if (resource === "delivery") {
    const rows = await db.select().from(s.deliveryZones).orderBy(s.deliveryZones.sortOrder);
    return ok({ zones: rows });
  }

  if (resource === "withdrawals") {
    const status = q.get("status");
    const rows = await db.select({ wd: s.withdrawals, shopName: s.vendors.shopName, owner: s.users.name })
      .from(s.withdrawals).innerJoin(s.users, eq(s.withdrawals.vendorId, s.users.id))
      .leftJoin(s.vendors, eq(s.withdrawals.vendorId, s.vendors.userId))
      .orderBy(desc(s.withdrawals.createdAt)).limit(100);
    return ok({ withdrawals: status ? rows.filter((r) => r.wd.status === status) : rows });
  }

  if (resource === "settings") {
    const rows = await db.select().from(s.settings);
    return ok({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  }

  if (resource === "sections") {
    const rows = await db.select().from(s.homepageSections).orderBy(s.homepageSections.sortOrder);
    return ok({ sections: rows });
  }

  if (resource === "banners") {
    const rows = await db.select().from(s.banners).orderBy(s.banners.position, s.banners.sortOrder);
    return ok({ banners: rows });
  }

  if (resource === "audit-logs") {
    const page = Math.max(1, Number(q.get("page") || 1));
    const [total, rows] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(s.auditLogs),
      db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(30).offset((page - 1) * 30),
    ]);
    return ok({ logs: rows, total: total[0]?.n ?? 0, page });
  }

  if (resource === "catalog") {
    const [cats, brands] = await Promise.all([
      db.select().from(s.categories).orderBy(s.categories.sortOrder),
      db.select().from(s.brands).orderBy(s.brands.name),
    ]);
    return ok({ categories: cats, brands });
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- POST
export async function POST(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const g = await guard(resource);
  if ("error" in g) return g.error;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const me = g.user;

  if (resource === "vendors") {
    const schema = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]), reason: z.string().max(500).optional(), commission: z.number().min(0).max(50).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const v = await db.select().from(s.vendors).where(eq(s.vendors.id, p.data.id)).limit(1);
    if (!v[0]) return fail("Vendor not found", 404, "NOT_FOUND");
    const patch: Partial<typeof s.vendors.$inferInsert> = {
      status: p.data.action === "approve" ? "approved" : "rejected",
      reviewedAt: new Date(), rejectedReason: p.data.action === "reject" ? (p.data.reason || "Application rejected") : null,
      updatedAt: new Date(),
    };
    if (p.data.action === "approve") {
      if (p.data.commission !== undefined) patch.commissionRate = String(p.data.commission);
      else {
        const def = await db.select().from(s.settings).where(eq(s.settings.key, "defaultCommission")).limit(1);
        patch.commissionRate = String((def[0]?.value as { percent?: number })?.percent ?? 10);
      }
    }
    await db.update(s.vendors).set(patch).where(eq(s.vendors.id, p.data.id));
    await notify(v[0].userId, "vendor", p.data.action === "approve" ? "Shop approved" : "Application rejected",
      p.data.action === "approve" ? `Congratulations! ${v[0].shopName} is now live on Bazzaro.` : (p.data.reason || "Your application was rejected."), `/vendor`);
    await audit(me.id, me.name, `vendor.${p.data.action}`, "vendor", p.data.id, { reason: p.data.reason }, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "products") {
    if (!b.value.action || b.value.action === "create") {
      try {
        const product = await createCatalogProduct(b.value, {
          id: me.id, name: me.name, role: "admin", ip: clientIp(req),
        });
        return ok({ product }, 201);
      } catch (e) {
        const err = e as Error & { status?: number; code?: string };
        return fail(err.message || "Could not create product", err.status ?? 500, err.code ?? "PRODUCT_FAILED");
      }
    }
    const schema = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject", "feature", "unfeature", "archive"]), reason: z.string().max(500).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const rows = await db.select().from(s.products).where(eq(s.products.id, p.data.id)).limit(1);
    if (!rows[0]) return fail("Product not found", 404, "NOT_FOUND");
    if (p.data.action === "approve" || p.data.action === "feature") {
      if (!(await hasProductPhoto(rows[0].id))) return fail("Upload a product photo before publishing", 409, "PHOTO_REQUIRED");
      const seller = await db.select({ status: s.vendors.status }).from(s.vendors).where(eq(s.vendors.userId, rows[0].vendorId)).limit(1);
      if (seller[0]?.status !== "approved") return fail("The seller must be approved first", 409, "SELLER_NOT_APPROVED");
    }
    if (p.data.action === "feature" && rows[0].status !== "approved") return fail("Approve the product before featuring it", 409, "APPROVAL_REQUIRED");
    if (p.data.action === "approve") await db.update(s.products).set({ status: "approved", rejectionReason: null }).where(eq(s.products.id, p.data.id));
    else if (p.data.action === "reject") await db.update(s.products).set({ status: "rejected", rejectionReason: p.data.reason || "Does not meet quality guidelines" }).where(eq(s.products.id, p.data.id));
    else if (p.data.action === "feature") await db.update(s.products).set({ isFeatured: true }).where(eq(s.products.id, p.data.id));
    else if (p.data.action === "unfeature") await db.update(s.products).set({ isFeatured: false }).where(eq(s.products.id, p.data.id));
    else await db.update(s.products).set({ status: "archived" }).where(eq(s.products.id, p.data.id));
    await notify(rows[0].vendorId, "product", `Product ${p.data.action}d: ${rows[0].name}`, p.data.reason || "", `/vendor?tab=products`);
    await audit(me.id, me.name, `product.${p.data.action}`, "product", p.data.id, { reason: p.data.reason }, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "returns") {
    const schema = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject", "picked", "refund"]), note: z.string().max(500).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    try {
      const ret = await resolveReturn({ returnId: p.data.id, action: p.data.action, actorId: me.id, actorName: me.name, note: p.data.note, ip: clientIp(req) });
      return ok({ ret });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message, err.status || 500, err.code || "RETURN_FAILED");
    }
  }

  if (resource === "withdrawals") {
    const schema = z.object({ id: z.string().uuid(), action: z.enum(["approve", "processing", "paid", "reject"]), note: z.string().max(500).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const w = await db.select().from(s.withdrawals).where(eq(s.withdrawals.id, p.data.id)).limit(1);
    if (!w[0]) return fail("Withdrawal not found", 404, "NOT_FOUND");
    const map = { approve: "approved", processing: "processing", paid: "paid", reject: "rejected" } as const;
    await db.update(s.withdrawals).set({ status: map[p.data.action], note: p.data.note || null, processedBy: me.id, processedAt: new Date() }).where(eq(s.withdrawals.id, p.data.id));
    if (p.data.action === "paid") {
      const bal = await db.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, w[0].vendorId));
      const running = (bal[0]?.n ?? 0) - w[0].amount;
      await db.insert(s.vendorTransactions).values({ vendorId: w[0].vendorId, type: "withdrawal", amount: -w[0].amount, balanceAfter: running, note: `Withdrawal paid (${w[0].id.slice(0, 8)})` });
    }
    await notify(w[0].vendorId, "withdrawal", `Withdrawal ${map[p.data.action]}`, `Rs. ${w[0].amount.toLocaleString()} — ${p.data.note || map[p.data.action]}`, `/vendor?tab=wallet`);
    await audit(me.id, me.name, `withdrawal.${p.data.action}`, "withdrawal", p.data.id, { note: p.data.note }, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "coupons") {
    const schema = z.object({
      code: z.string().min(3).max(24), description: z.string().max(300).nullable().optional(),
      type: z.enum(["percent", "fixed"]), value: z.number().int().min(1),
      minOrderAmount: z.number().int().min(0).optional(), maxDiscount: z.number().int().min(0).nullable().optional(),
      usageLimit: z.number().int().min(1).nullable().optional(), perUserLimit: z.number().int().min(1).optional(),
      startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().nullable().optional(),
      scope: z.enum(["all", "category", "product", "vendor"]).optional(),
      categoryIds: z.array(z.string().uuid()).optional(), productIds: z.array(z.string().uuid()).optional(),
      firstOrderOnly: z.boolean().optional(), freeDelivery: z.boolean().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (p.data.type === "percent" && p.data.value > 95) return fail("Percent discount max is 95", 400, "BAD_VALUE");
    try {
      const [c] = await db.insert(s.coupons).values({
        code: p.data.code.trim().toUpperCase(), description: p.data.description || null,
        type: p.data.type, value: p.data.value, minOrderAmount: p.data.minOrderAmount ?? 0,
        maxDiscount: p.data.maxDiscount ?? null, usageLimit: p.data.usageLimit ?? null,
        perUserLimit: p.data.perUserLimit ?? 1, startsAt: p.data.startsAt ? new Date(p.data.startsAt) : new Date(),
        endsAt: p.data.endsAt ? new Date(p.data.endsAt) : null, scope: p.data.scope ?? "all",
        categoryIds: p.data.categoryIds ?? [], productIds: p.data.productIds ?? [],
        firstOrderOnly: p.data.firstOrderOnly ?? false, freeDelivery: p.data.freeDelivery ?? false,
      }).returning();
      await audit(me.id, me.name, "coupon.create", "coupon", c.id, { code: c.code }, clientIp(req));
      return ok({ coupon: c }, 201);
    } catch {
      return fail("Coupon code already exists", 409, "DUPLICATE");
    }
  }

  if (resource === "delivery") {
    const schema = z.object({
      name: z.string().min(2).max(120), districts: z.array(z.string().max(60)).max(77),
      fee: z.number().int().min(0), freeThreshold: z.number().int().min(0),
      estDaysMin: z.number().int().min(0).max(30), estDaysMax: z.number().int().min(0).max(30),
      codEnabled: z.boolean().optional(), expressEnabled: z.boolean().optional(),
      sameDayEnabled: z.boolean().optional(), pickupEnabled: z.boolean().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const [z2] = await db.insert(s.deliveryZones).values({
      name: p.data.name, districts: p.data.districts, fee: p.data.fee, freeThreshold: p.data.freeThreshold,
      estDaysMin: p.data.estDaysMin, estDaysMax: p.data.estDaysMax, codEnabled: p.data.codEnabled ?? true,
      expressEnabled: p.data.expressEnabled ?? false, sameDayEnabled: p.data.sameDayEnabled ?? false, pickupEnabled: p.data.pickupEnabled ?? false,
    }).returning();
    await audit(me.id, me.name, "delivery.create", "zone", z2.id, { name: z2.name }, clientIp(req));
    return ok({ zone: z2 }, 201);
  }

  if (resource === "banners") {
    const schema = z.object({
      title: z.string().trim().min(2).max(160),
      subtitle: z.string().trim().max(300).nullable().optional(),
      image: z.string().min(1).max(600),
      color: z.string().regex(/^#[a-f\d]{6}$/i).optional(),
      linkHref: z.string().max(300).refine((x) => !x || (x.startsWith("/") && !x.startsWith("//")), "Use an internal page link").nullable().optional(),
      position: z.enum(["hero", "promo"]).optional(), sortOrder: z.number().int().min(0).optional(),
      startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(),
      isActive: z.boolean().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (!(await validateBannerPhoto(p.data.image, me.id))) return fail("Upload a banner photo first", 422, "INVALID_IMAGE");
    if (p.data.startsAt && p.data.endsAt && new Date(p.data.startsAt) >= new Date(p.data.endsAt)) {
      return fail("Campaign end must be after start", 422, "INVALID_DATES");
    }
    const [bn] = await db.insert(s.banners).values({
      title: p.data.title, subtitle: p.data.subtitle || null, image: p.data.image,
      color: p.data.color || "#f59e0b", linkHref: p.data.linkHref || null,
      position: p.data.position || "hero", sortOrder: p.data.sortOrder ?? 0,
      isActive: p.data.isActive ?? true,
      startsAt: p.data.startsAt ? new Date(p.data.startsAt) : null,
      endsAt: p.data.endsAt ? new Date(p.data.endsAt) : null,
    }).returning();
    await audit(me.id, me.name, "banner.create", "banner", bn.id, { image: bn.image, dates: [bn.startsAt, bn.endsAt] }, clientIp(req));
    return ok({ banner: bn }, 201);
  }

  if (resource === "catalog") {
    const kind = b.value.kind as string;
    if (kind === "category") {
      const schema = z.object({ name: z.string().min(2).max(80), description: z.string().max(500).nullable().optional(), icon: z.string().max(30).optional(), color: z.string().max(20).optional(), parentId: z.string().uuid().nullable().optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      let slug = slugify(p.data.name);
      const taken = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, slug)).limit(1);
      if (taken[0]) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      const [c] = await db.insert(s.categories).values({ name: p.data.name, slug, description: p.data.description || null, icon: p.data.icon || "Package", color: p.data.color || "#0ea5e9", parentId: p.data.parentId ?? null }).returning();
      return ok({ category: c }, 201);
    }
    if (kind === "brand") {
      const schema = z.object({ name: z.string().min(2).max(80), color: z.string().max(20).optional(), description: z.string().max(500).nullable().optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      let slug = slugify(p.data.name);
      const taken = await db.select({ id: s.brands.id }).from(s.brands).where(eq(s.brands.slug, slug)).limit(1);
      if (taken[0]) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      const [br] = await db.insert(s.brands).values({ name: p.data.name, slug, color: p.data.color || "#f59e0b", description: p.data.description || null }).returning();
      return ok({ brand: br }, 201);
    }
    return fail("Unknown catalog kind", 400, "BAD_REQUEST");
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- PATCH
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const g = await guard(resource);
  if ("error" in g) return g.error;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const me = g.user;

  if (resource === "products") {
    const id = typeof b.value.id === "string" ? b.value.id : "";
    if (!id) return fail("Product required", 400, "BAD_REQUEST");
    try {
      const product = await updateCatalogProduct(id, b.value, {
        id: me.id, name: me.name, role: "admin", ip: clientIp(req),
      });
      return ok({ product });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message || "Could not edit product", err.status ?? 500, err.code ?? "PRODUCT_FAILED");
    }
  }

  if (resource === "users") {
    const schema = z.object({ id: z.string().uuid(), role: z.enum(["customer", "vendor", "admin"]).optional(), adminTier: z.enum(["super_admin", "product_admin", "order_admin", "finance_admin", "vendor_manager", "support_agent"]).nullable().optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (p.data.id === me.id && p.data.role && p.data.role !== "admin") return fail("You cannot demote yourself", 400, "SELF_DEMOTE");
    const patch: Partial<typeof s.users.$inferInsert> = { updatedAt: new Date() };
    if (p.data.role) patch.role = p.data.role;
    if (p.data.adminTier !== undefined) patch.adminTier = p.data.adminTier;
    await db.update(s.users).set(patch).where(eq(s.users.id, p.data.id));
    await audit(me.id, me.name, "user.update", "user", p.data.id, patch, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "orders") {
    const schema = z.object({ id: z.string().uuid(), status: z.string().min(2), note: z.string().max(500).optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    try {
      const order = await transitionOrder(p.data.id, p.data.status, me.id, me.name, p.data.note || `Updated by ${me.name}`, clientIp(req));
      return ok({ order });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      return fail(err.message, err.status || 500, err.code || "ORDER_FAILED");
    }
  }

  if (resource === "coupons") {
    const id = b.value.id as string;
    if (!id) return fail("Coupon required", 400, "BAD_REQUEST");
    const schema = z.object({
      description: z.string().max(300).nullable().optional(), value: z.number().int().min(1).optional(),
      minOrderAmount: z.number().int().min(0).optional(), maxDiscount: z.number().int().min(0).nullable().optional(),
      usageLimit: z.number().int().min(1).nullable().optional(), endsAt: z.string().datetime().nullable().optional(),
      isActive: z.boolean().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const patch: Partial<typeof s.coupons.$inferInsert> = {};
    if (p.data.description !== undefined) patch.description = p.data.description;
    if (p.data.value !== undefined) patch.value = p.data.value;
    if (p.data.minOrderAmount !== undefined) patch.minOrderAmount = p.data.minOrderAmount;
    if (p.data.maxDiscount !== undefined) patch.maxDiscount = p.data.maxDiscount;
    if (p.data.usageLimit !== undefined) patch.usageLimit = p.data.usageLimit;
    if (p.data.endsAt !== undefined) patch.endsAt = p.data.endsAt ? new Date(p.data.endsAt) : null;
    if (p.data.isActive !== undefined) patch.isActive = p.data.isActive;
    await db.update(s.coupons).set(patch).where(eq(s.coupons.id, id));
    return ok({ done: true });
  }

  if (resource === "delivery") {
    const id = b.value.id as string;
    if (!id) return fail("Zone required", 400, "BAD_REQUEST");
    const schema = z.object({
      name: z.string().min(2).max(120).optional(), districts: z.array(z.string().max(60)).max(77).optional(),
      fee: z.number().int().min(0).optional(), freeThreshold: z.number().int().min(0).optional(),
      estDaysMin: z.number().int().min(0).max(30).optional(), estDaysMax: z.number().int().min(0).max(30).optional(),
      codEnabled: z.boolean().optional(), expressEnabled: z.boolean().optional(),
      sameDayEnabled: z.boolean().optional(), pickupEnabled: z.boolean().optional(), isActive: z.boolean().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    await db.update(s.deliveryZones).set(p.data).where(eq(s.deliveryZones.id, id));
    await audit(me.id, me.name, "delivery.update", "zone", id, p.data, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "settings") {
    const allowed = ["autoApproveProducts", "defaultCommission", "platformName"];
    for (const k of Object.keys(b.value)) {
      if (!allowed.includes(k)) continue;
      await db.insert(s.settings).values({ key: k, value: b.value[k] as Record<string, unknown> })
        .onConflictDoUpdate({ target: s.settings.key, set: { value: b.value[k] as Record<string, unknown>, updatedAt: new Date() } });
    }
    await audit(me.id, me.name, "settings.update", "settings", "-", b.value, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "sections") {
    const schema = z.object({ sections: z.array(z.object({ id: z.string().uuid(), title: z.string().max(120).optional(), subtitle: z.string().max(300).nullable().optional(), enabled: z.boolean().optional(), sortOrder: z.number().int().optional() })) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    for (const sec of p.data.sections) {
      const patch: Partial<typeof s.homepageSections.$inferInsert> = {};
      if (sec.title !== undefined) patch.title = sec.title;
      if (sec.subtitle !== undefined) patch.subtitle = sec.subtitle;
      if (sec.enabled !== undefined) patch.enabled = sec.enabled;
      if (sec.sortOrder !== undefined) patch.sortOrder = sec.sortOrder;
      await db.update(s.homepageSections).set(patch).where(eq(s.homepageSections.id, sec.id));
    }
    await audit(me.id, me.name, "cms.sections", "homepage_sections", "-", {}, clientIp(req));
    return ok({ done: true });
  }

  if (resource === "banners") {
    const id = typeof b.value.id === "string" ? b.value.id : "";
    if (!z.string().uuid().safeParse(id).success) return fail("Valid banner ID required", 400, "BAD_REQUEST");
    const schema = z.object({
      title: z.string().trim().min(2).max(160).optional(),
      subtitle: z.string().trim().max(300).nullable().optional(),
      image: z.string().min(1).max(600).optional(),
      color: z.string().regex(/^#[a-f\d]{6}$/i).optional(),
      linkHref: z.string().max(300).refine((x) => !x || (x.startsWith("/") && !x.startsWith("//")), "Use an internal page link").nullable().optional(),
      position: z.enum(["hero", "promo"]).optional(),
      sortOrder: z.number().int().min(0).optional(), isActive: z.boolean().optional(),
      startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(),
    });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const [existing] = await db.select().from(s.banners).where(eq(s.banners.id, id)).limit(1);
    if (!existing) return fail("Banner not found", 404, "NOT_FOUND");
    if (p.data.image && p.data.image !== existing.image && !(await validateBannerPhoto(p.data.image, me.id))) {
      return fail("Upload a valid banner photo first", 422, "INVALID_IMAGE");
    }
    const start = p.data.startsAt === undefined ? existing.startsAt : p.data.startsAt ? new Date(p.data.startsAt) : null;
    const end = p.data.endsAt === undefined ? existing.endsAt : p.data.endsAt ? new Date(p.data.endsAt) : null;
    if (start && end && start >= end) return fail("Campaign end must be after start", 422, "INVALID_DATES");
    const { startsAt: _startsAt, endsAt: _endsAt, ...rest } = p.data;
    const [banner] = await db.update(s.banners).set({
      ...rest, startsAt: start, endsAt: end,
    }).where(eq(s.banners.id, id)).returning();
    await audit(me.id, me.name, "banner.update", "banner", id, { image: banner.image, dates: [start, end] }, clientIp(req));
    return ok({ banner });
  }

  if (resource === "catalog") {
    const kind = b.value.kind as string;
    const id = b.value.id as string;
    if (!id) return fail("ID required", 400, "BAD_REQUEST");
    if (kind === "category") {
      const schema = z.object({ name: z.string().min(2).max(80).optional(), description: z.string().max(500).nullable().optional(), icon: z.string().max(30).optional(), color: z.string().max(20).optional(), isActive: z.boolean().optional(), sortOrder: z.number().int().optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      await db.update(s.categories).set(p.data).where(eq(s.categories.id, id));
      return ok({ done: true });
    }
    if (kind === "brand") {
      const schema = z.object({ name: z.string().min(2).max(80).optional(), color: z.string().max(20).optional(), description: z.string().max(500).nullable().optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      await db.update(s.brands).set(p.data).where(eq(s.brands.id, id));
      return ok({ done: true });
    }
    return fail("Unknown catalog kind", 400, "BAD_REQUEST");
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// ---------------------------------------------------------------- DELETE
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const g = await guard(resource);
  if ("error" in g) return g.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("ID required", 400, "BAD_REQUEST");
  if (resource === "coupons") {
    await db.delete(s.coupons).where(eq(s.coupons.id, id));
    return ok({ done: true });
  }
  if (resource === "delivery") {
    await db.delete(s.deliveryZones).where(eq(s.deliveryZones.id, id));
    return ok({ done: true });
  }
  if (resource === "banners") {
    await db.delete(s.banners).where(eq(s.banners.id, id));
    await audit(g.user.id, g.user.name, "banner.delete", "banner", id, {}, clientIp(req));
    return ok({ done: true });
  }
  if (resource === "catalog") {
    const kind = req.nextUrl.searchParams.get("kind");
    if (kind === "category") {
      const used = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.categoryId, id)).limit(1);
      if (used[0]) return fail("Category has products. Move them first.", 400, "IN_USE");
      await db.delete(s.categories).where(eq(s.categories.id, id));
      return ok({ done: true });
    }
    if (kind === "brand") {
      const used = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.brandId, id)).limit(1);
      if (used[0]) return fail("Brand has products. Move them first.", 400, "IN_USE");
      await db.delete(s.brands).where(eq(s.brands.id, id));
      return ok({ done: true });
    }
  }
  return fail("Not found", 404, "NOT_FOUND");
}
