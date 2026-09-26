// Safe to import on server and in client UI. Enforcement still happens on the server.
const ADMIN_AREAS: Record<string, readonly string[]> = {
  products: ["product_admin"],
  catalog: ["product_admin"],
  orders: ["order_admin", "product_admin"],
  delivery: ["order_admin"],
  refunds: ["finance_admin", "order_admin"],
  payments: ["finance_admin"],
  vendors: ["vendor_manager"],
  withdrawals: ["finance_admin"],
  support: ["support_agent"],
  customers: ["order_admin", "vendor_manager", "support_agent"],
  analytics: ["order_admin", "finance_admin", "vendor_manager", "product_admin", "support_agent"],
  sections: ["product_admin", "order_admin"],
  banners: ["product_admin", "order_admin"],
  settings: [],
  flashsales: ["product_admin", "order_admin"],
  coupons: ["order_admin", "finance_admin"],
  audit: [],
};

export function canAdminAccessTier(tier: string | null, area: string): boolean {
  if ((tier || "super_admin") === "super_admin") return true;
  return (ADMIN_AREAS[area] || []).includes(tier || "");
}
