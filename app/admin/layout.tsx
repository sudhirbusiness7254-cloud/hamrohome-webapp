import { redirect } from "next/navigation";
import { getSessionUser, canAccess } from "@/lib/auth";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { AdminSidebar } from "./sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  const areas = ["dashboard", "orders", "products", "catalog", "vendors", "customers", "returns", "withdrawals", "promos", "delivery", "support", "cms", "settings", "audit"];
  const areaName: Record<string, string> = { dashboard: "analytics", returns: "refunds", promos: "coupons", cms: "sections" };
  const allowed = areas.filter((area) => canAccess(user, areaName[area] ?? area));
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <div className="flex gap-6 items-start">
          <AdminSidebar userName={user.name} tier={user.adminTier || "super_admin"} allowed={allowed} />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer showNewsletter={false} />
    </div>
  );
}
