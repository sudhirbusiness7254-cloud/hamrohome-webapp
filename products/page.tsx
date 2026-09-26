import { Suspense } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ShopListing } from "@/components/marketplace/ShopListing";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-slate-400">Loading products...</div>}>
          <ShopListing title="All Products" subtitle="Everything from verified sellers across Nepal" />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
