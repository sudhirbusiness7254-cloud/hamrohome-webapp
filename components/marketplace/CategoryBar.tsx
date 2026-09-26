"use client";
import Link from "next/link";
import {
  Smartphone,
  Shirt,
  ShoppingBasket,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Gem,
  Laptop,
  ShirtIcon,
  Footprints,
  Wheat,
  Coffee,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const CATEGORY_DATA = [
  { name: "Electronics", slug: "electronics", icon: Smartphone, color: "#0ea5e9" },
  { name: "Fashion", slug: "fashion", icon: Shirt, color: "#ec4899" },
  { name: "Groceries", slug: "groceries", icon: ShoppingBasket, color: "#22c55e" },
  { name: "Home & Kitchen", slug: "home-kitchen", icon: Home, color: "#06b6d4" },
  { name: "Beauty", slug: "beauty", icon: Sparkles, color: "#d946ef" },
  { name: "Sports", slug: "sports", icon: Dumbbell, color: "#10b981" },
  { name: "Books", slug: "books", icon: BookOpen, color: "#64748b" },
  { name: "Mobile Phones", slug: "mobile-phones", icon: Smartphone, color: "#3b82f6" },
  { name: "Laptops", slug: "laptops", icon: Laptop, color: "#6366f1" },
  { name: "Footwear", slug: "footwear", icon: Footprints, color: "#84cc16" },
  { name: "Rice & Grains", slug: "rice-grains", icon: Wheat, color: "#eab308" },
  { name: "Tea & Spices", slug: "tea-spices", icon: Coffee, color: "#ef4444" },
];

export function CategoryBar() {
  return (
    <ScrollReveal stagger className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-white">
          Shop by <span className="gradient-text">Category</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">Find everything you need, organized by what matters to you.</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
        {CATEGORY_DATA.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="cat-pill group flex flex-col items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-4 hover:bg-slate-700/60 transition-all"
            >
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                <Icon className="h-6 w-6" style={{ color: cat.color }}/>
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white text-center transition-colors">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </ScrollReveal>
  );
}
