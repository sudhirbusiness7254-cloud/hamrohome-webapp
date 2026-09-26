import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { slugify } from "@/lib/format";
import { validateProductPhotos } from "@/lib/media";
import { audit, notify } from "@/lib/notify";

const variantInput = z.object({
  id: z.string().uuid().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  size: z.string().trim().max(20).nullable().optional(),
  sku: z.string().trim().max(60).optional(),
  price: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  barcode: z.string().trim().max(60).nullable().optional(),
  imageColor: z.string().regex(/^#[a-f\d]{6}$/i).nullable().optional(),
});

export const productInput = z.object({
  name: z.string().trim().min(3).max(200),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  shortDescription: z.string().max(300).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  price: z.number().int().positive().max(100_000_000),
  salePrice: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  weightGrams: z.number().int().min(0).optional(),
  warranty: z.string().max(200).nullable().optional(),
  returnPolicy: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
  variants: z.array(variantInput).max(60).optional(),
  images: z.array(z.string().max(600)).min(1).max(8),
  vendorId: z.string().uuid().optional(),
});

export type ProductInput = z.infer<typeof productInput>;

export function catalogError(message: string, status = 400, code = "PRODUCT_ERROR") {
  return Object.assign(new Error(message), { status, code });
}

async function checkRefs(data: ProductInput) {
  if (data.categoryId) {
    const cat = await db.select({ id: s.categories.id }).from(s.categories).where(and(eq(s.categories.id, data.categoryId), eq(s.categories.isActive, true))).limit(1);
    if (!cat[0]) throw catalogError("Choose a valid category", 422, "INVALID_CATEGORY");
  }
  if (data.brandId) {
    const brand = await db.select({ id: s.brands.id }).from(s.brands).where(eq(s.brands.id, data.brandId)).limit(1);
    if (!brand[0]) throw catalogError("Choose a valid brand", 422, "INVALID_BRAND");
  }
}

async function checkApprovedSeller(vendorId: string) {
  const vendor = await db.select().from(s.vendors).where(eq(s.vendors.userId, vendorId)).limit(1);
  if (!vendor[0] || vendor[0].status !== "approved") {
    throw catalogError("Select an approved seller for this product", 422, "SELLER_NOT_APPROVED");
  }
  return vendor[0];
}

function productValues(data: ProductInput) {
  return {
    name: data.name.trim(),
    categoryId: data.categoryId ?? null,
    brandId: data.brandId ?? null,
    shortDescription: data.shortDescription?.trim() || null,
    description: data.description?.trim() || null,
    price: data.price,
    salePrice: data.salePrice ?? null,
    lowStockThreshold: data.lowStockThreshold ?? 5,
    weightGrams: data.weightGrams ?? 0,
    warranty: data.warranty?.trim() || null,
    returnPolicy: data.returnPolicy?.trim() || "7 days return",
    tags: data.tags ?? [],
  };
}

function checkPrice(data: ProductInput) {
  if (data.salePrice != null && data.salePrice >= data.price) {
    throw catalogError("Sale price must be lower than regular price", 422, "INVALID_SALE_PRICE");
  }
}

export async function createCatalogProduct(raw: unknown, actor: { id: string; name: string; role: "admin" | "vendor"; ip?: string | null }) {
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) throw catalogError(parsed.error.issues[0]?.message || "Invalid product details", 422, "VALIDATION_ERROR");
  const data = parsed.data;
  checkPrice(data);
  await checkRefs(data);
  const vendorId = actor.role === "admin" ? data.vendorId : actor.id;
  if (!vendorId) throw catalogError("Choose a seller for this product", 422, "SELLER_REQUIRED");
  const seller = await checkApprovedSeller(vendorId);
  if (!(await validateProductPhotos(data.images, actor.id, actor.role === "admin"))) {
    throw catalogError("Upload at least one valid product photo before saving", 422, "INVALID_IMAGES");
  }
  if (data.variants?.some((v) => v.id)) throw catalogError("New variants cannot have IDs", 422, "INVALID_VARIANT");

  const base = slugify(data.name) || "item";
  const slug = `${base}-${randomUUID().slice(0, 6)}`;
  const sku = `BZ-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const variants = data.variants ?? [];
  const physical = variants.length ? variants.reduce((sum, v) => sum + v.stock, 0) : data.stock ?? 0;
  if (physical > 1_000_000) throw catalogError("Total stock exceeds allowed limit", 422, "INVALID_STOCK");

  const product = await db.transaction(async (tx) => {
    const [created] = await tx.insert(s.products).values({
      ...productValues(data), vendorId, slug, sku, stock: physical,
      // Vendor listings ALWAYS require explicit admin verification.
      status: actor.role === "admin" ? "approved" : "pending",
    }).returning();
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const [saved] = await tx.insert(s.productVariants).values({
        productId: created.id,
        name: [v.color, v.size].filter(Boolean).join(" / ") || `Option ${i + 1}`,
        color: v.color || null, size: v.size || null,
        sku: v.sku || `${sku}-V${i + 1}`, price: v.price ?? null, stock: v.stock,
        barcode: v.barcode || null, imageColor: v.imageColor || "#94a3b8",
      }).returning();
      await tx.insert(s.inventoryTransactions).values({
        productId: created.id, variantId: saved.id, type: "restock", quantity: v.stock,
        balanceAfter: v.stock, note: "Initial variant stock", actorId: actor.id,
      });
    }
    if (variants.length === 0) {
      await tx.insert(s.inventoryTransactions).values({
        productId: created.id, type: "restock", quantity: physical,
        balanceAfter: physical, note: "Initial stock", actorId: actor.id,
      });
    }
    await tx.insert(s.productImages).values(data.images.map((url, i) => ({
      productId: created.id, url, alt: `${created.name} — view ${i + 1}`, sortOrder: i,
    })));
    return created;
  });

  if (actor.role === "vendor") {
    const admins = await db.select({ id: s.users.id, tier: s.users.adminTier }).from(s.users).where(eq(s.users.role, "admin"));
    for (const a of admins.filter((a) => a.tier === "super_admin" || a.tier === "product_admin")) {
      await notify(a.id, "product", "Product awaiting review", `${product.name} by ${seller.shopName}`, "/admin?tab=products");
    }
    await notify(actor.id, "product", "Sent for approval", `${product.name} is pending admin verification.`, "/vendor?tab=products");
  } else {
    await notify(vendorId, "product", "New product published", `Bazzaro added ${product.name} to your store.`, "/vendor?tab=products");
  }
  await audit(actor.id, actor.name, actor.role === "admin" ? "admin.product.create" : "vendor.product.submit", "product", product.id, { vendorId, status: product.status, photoCount: data.images.length }, actor.ip);
  return product;
}

export async function updateCatalogProduct(id: string, raw: unknown, actor: { id: string; name: string; role: "admin" | "vendor"; ip?: string | null }) {
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) throw catalogError(parsed.error.issues[0]?.message || "Invalid product details", 422, "VALIDATION_ERROR");
  const data = parsed.data;
  checkPrice(data);
  await checkRefs(data);
  const [old] = await db.select().from(s.products).where(eq(s.products.id, id)).limit(1);
  if (!old || (actor.role === "vendor" && old.vendorId !== actor.id)) throw catalogError("Product not found", 404, "NOT_FOUND");
  if (old.status === "archived") throw catalogError("Archived products cannot be edited", 409, "PRODUCT_ARCHIVED");
  if (actor.role === "admin" && data.vendorId && data.vendorId !== old.vendorId) await checkApprovedSeller(data.vendorId);
  if (!(await validateProductPhotos(data.images, actor.id, actor.role === "admin", id))) {
    throw catalogError("Upload at least one valid product photo before saving", 422, "INVALID_IMAGES");
  }
  const currentImages = await db.select().from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(s.productImages.sortOrder);
  const imageChanged = JSON.stringify(currentImages.map((x) => x.url)) !== JSON.stringify(data.images);
  const currentVariants = await db.select().from(s.productVariants).where(and(eq(s.productVariants.productId, id), eq(s.productVariants.isActive, true)));
  const nextVariants = data.variants ?? currentVariants.map((v) => ({ id: v.id, color: v.color, size: v.size, sku: v.sku, price: v.price, stock: v.stock, barcode: v.barcode, imageColor: v.imageColor }));
  if (new Set(nextVariants.filter((v) => v.id).map((v) => v.id)).size !== nextVariants.filter((v) => v.id).length) {
    throw catalogError("Duplicate variants are not allowed", 422, "DUPLICATE_VARIANTS");
  }
  for (const v of nextVariants) {
    if (v.id && !currentVariants.some((x) => x.id === v.id)) throw catalogError("Variant does not belong to this product", 422, "INVALID_VARIANT");
    const oldV = currentVariants.find((x) => x.id === v.id);
    if (oldV && v.stock < oldV.reservedStock) throw catalogError(`Stock for ${oldV.name} cannot be below reserved stock`, 409, "RESERVED_STOCK");
  }
  for (const v of currentVariants) {
    if (!nextVariants.some((x) => x.id === v.id) && v.reservedStock > 0) {
      throw catalogError(`Cannot remove ${v.name} while units are reserved`, 409, "RESERVED_STOCK");
    }
  }
  const physical = nextVariants.length ? nextVariants.reduce((sum, v) => sum + v.stock, 0) : data.stock ?? old.stock;
  if (physical > 1_000_000 || physical < old.reservedStock) throw catalogError("Stock cannot be below reserved units", 409, "RESERVED_STOCK");
  const next = {
    ...productValues(data),
    lowStockThreshold: data.lowStockThreshold ?? old.lowStockThreshold,
    weightGrams: data.weightGrams ?? old.weightGrams,
    returnPolicy: data.returnPolicy === undefined ? old.returnPolicy : data.returnPolicy,
    tags: data.tags ?? old.tags,
  };
  const materialKeys = ["name", "categoryId", "brandId", "shortDescription", "description", "price", "salePrice", "warranty", "returnPolicy", "tags"] as const;
  const changedDetails = materialKeys.some((k) => JSON.stringify(next[k]) !== JSON.stringify(old[k]));
  const changedOptions = nextVariants.length !== currentVariants.length || nextVariants.some((v) => {
    const prev = currentVariants.find((x) => x.id === v.id);
    return !prev || prev.color !== (v.color || null) || prev.size !== (v.size || null) || prev.price !== (v.price ?? null);
  });
  const needsReview = actor.role === "vendor" && (old.status !== "approved" || changedDetails || changedOptions || imageChanged);
  const resetApproval = needsReview && old.status === "approved";

  const updated = await db.transaction(async (tx) => {
    const [saved] = await tx.update(s.products).set({
      ...next, vendorId: actor.role === "admin" && data.vendorId ? data.vendorId : old.vendorId,
      stock: physical, updatedAt: new Date(),
      ...(needsReview ? { status: "pending" as const, rejectionReason: null } : {}),
    }).where(eq(s.products.id, id)).returning();

    for (let i = 0; i < nextVariants.length; i++) {
      const v = nextVariants[i];
      const prev = currentVariants.find((x) => x.id === v.id);
      if (prev) {
        await tx.update(s.productVariants).set({
          name: [v.color, v.size].filter(Boolean).join(" / ") || prev.name,
          color: v.color || null, size: v.size || null,
          price: v.price ?? null, stock: v.stock,
          imageColor: v.imageColor || prev.imageColor,
        }).where(eq(s.productVariants.id, prev.id));
        if (v.stock !== prev.stock) {
          await tx.insert(s.inventoryTransactions).values({
            productId: id, variantId: prev.id, type: "adjustment", quantity: v.stock - prev.stock,
            balanceAfter: v.stock, note: `${actor.role} inventory adjustment`, actorId: actor.id,
          });
        }
      } else {
        const [created] = await tx.insert(s.productVariants).values({
          productId: id, name: [v.color, v.size].filter(Boolean).join(" / ") || `Option ${i + 1}`,
          color: v.color || null, size: v.size || null,
          sku: v.sku || `${old.sku}-V${randomUUID().slice(0, 5)}`,
          price: v.price ?? null, stock: v.stock,
          barcode: v.barcode || null, imageColor: v.imageColor || "#94a3b8",
        }).returning();
        await tx.insert(s.inventoryTransactions).values({
          productId: id, variantId: created.id, type: "restock", quantity: v.stock,
          balanceAfter: v.stock, note: "New variant", actorId: actor.id,
        });
      }
    }
    for (const removed of currentVariants.filter((v) => !nextVariants.some((x) => x.id === v.id))) {
      await tx.update(s.productVariants).set({ isActive: false, stock: 0 }).where(eq(s.productVariants.id, removed.id));
      await tx.insert(s.inventoryTransactions).values({
        productId: id, variantId: removed.id, type: "adjustment", quantity: -removed.stock,
        balanceAfter: 0, note: "Variant retired", actorId: actor.id,
      });
    }
    if (currentVariants.length === 0 && nextVariants.length === 0 && physical !== old.stock) {
      await tx.insert(s.inventoryTransactions).values({
        productId: id, type: "adjustment", quantity: physical - old.stock,
        balanceAfter: physical, note: `${actor.role} inventory adjustment`, actorId: actor.id,
      });
    }
    if (imageChanged) {
      await tx.delete(s.productImages).where(eq(s.productImages.productId, id));
      await tx.insert(s.productImages).values(data.images.map((url, i) => ({
        productId: id, url, alt: `${data.name} — view ${i + 1}`, sortOrder: i,
      })));
    }
    return saved;
  });
  if (needsReview) {
    const admins = await db.select({ id: s.users.id, tier: s.users.adminTier }).from(s.users).where(eq(s.users.role, "admin"));
    for (const a of admins.filter((a) => a.tier === "super_admin" || a.tier === "product_admin")) {
      await notify(a.id, "product", resetApproval ? "Updated product needs reapproval" : "Product awaiting review", `${updated.name} needs your review.`, "/admin?tab=products");
    }
  }
  await audit(actor.id, actor.name, actor.role === "admin" ? "admin.product.update" : "vendor.product.update", "product", id, { photoCount: data.images.length, status: updated.status, reapproval: resetApproval }, actor.ip);
  return updated;
}
