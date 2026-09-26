import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { VendorSidebar } from "./sidebar";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor");
  if (user.role === "admin") redirect("/admin");
  if (user.role !== "vendor") redirect("/vendor/register");
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <div className="flex gap-6 items-start">
          <VendorSidebar userName={user.name} />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer showNewsletter={false} />
    </div>
  );
}
