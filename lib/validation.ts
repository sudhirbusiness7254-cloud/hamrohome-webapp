import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().max(60).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().regex(/^(?:\+977)?9[678]\d{8}$/).optional()
});

export const cartItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(99)
});

export const checkoutSchema = z.object({
  addressId: z.string().cuid(),
  deliveryZoneId: z.string().cuid(),
  method: z.enum(['ESEWA', 'KHALTI', 'FONEPAY', 'COD']),
  couponCode: z.string().max(32).optional()
});

export const returnSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.enum(['DAMAGED', 'WRONG_PRODUCT', 'DEFECTIVE', 'MISSING_ITEM', 'SIZE_ISSUE', 'OTHER']),
  note: z.string().max(1000).optional(),
  itemIds: z.array(z.string().cuid()).min(1)
});
