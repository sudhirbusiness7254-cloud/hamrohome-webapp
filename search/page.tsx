"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ShopListing } from "@/components/marketplace/ShopListing";

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  return <ShopListing key={q} title="Search Results" subtitle={q ? `Showing results for "${q}"` : "Type in the search bar to find products"} initialQuery={q} />;
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-slate-400">Searching...</div>}>
          <SearchInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
