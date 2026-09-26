// NPR formatting + presentation helpers
export function formatNPR(paisa: number | string | null | undefined): string {
  const n = Number(paisa ?? 0);
  return `Rs. ${n.toLocaleString("en-NP", { maximumFractionDigits: 0 })}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(date);
}

export const ORDER_STATUS_META: Record<string, { label: string; color: string; step: number }> = {
  pending_payment: { label: "Pending Payment", color: "#f59e0b", step: 0 },
  payment_failed: { label: "Payment Failed", color: "#ef4444", step: 0 },
  payment_verified: { label: "Payment Verified", color: "#10b981", step: 1 },
  confirmed: { label: "Confirmed", color: "#0ea5e9", step: 1 },
  processing: { label: "Processing", color: "#0ea5e9", step: 2 },
  packed: { label: "Packed", color: "#0ea5e9", step: 3 },
  shipped: { label: "Shipped", color: "#6366f1", step: 4 },
  out_for_delivery: { label: "Out for Delivery", color: "#6366f1", step: 5 },
  delivered: { label: "Delivered", color: "#10b981", step: 6 },
  cancelled: { label: "Cancelled", color: "#ef4444", step: -1 },
  return_requested: { label: "Return Requested", color: "#f59e0b", step: -1 },
  return_approved: { label: "Return Approved", color: "#f59e0b", step: -1 },
  return_rejected: { label: "Return Rejected", color: "#ef4444", step: -1 },
  refunded: { label: "Refunded", color: "#10b981", step: -1 },
};

export const ORDER_FLOW = ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  esewa: "eSewa",
  khalti: "Khalti",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
