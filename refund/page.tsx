import Link from "next/link";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";

const STEPS = [
  ["1. Request", "Go to My Orders, open the delivered order, and click Request Return. Select a reason and describe the issue."],
  ["2. Review", "The seller (or Bazzaro support) reviews your request within 48 hours and approves or rejects it with a reason."],
  ["3. Pickup", "For approved returns, our delivery partner collects the item from your address. Keep the original packaging where possible."],
  ["4. Quality Check", "The item is inspected. If it matches the reported issue and policy terms, your refund is approved."],
  ["5. Refund", "eSewa/Khalti payments are refunded to the wallet within 5-7 business days. COD orders are refunded via bank transfer or wallet — our team will contact you."],
];

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black text-white">Return & Refund Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Simple, transparent, and fair — for customers and sellers.</p>
        <div className="mt-6 space-y-4">
          {STEPS.map(([t, b]) => (
            <section key={t} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
              <h2 className="font-black text-white">{t}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{b}</p>
            </section>
          ))}
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="font-black text-white">Non-returnable Items</h2>
            <p className="mt-2 text-sm text-slate-300">Perishable groceries, opened personal-care items, and final-sale products marked at purchase — unless damaged, defective, or wrong on arrival.</p>
          </section>
          <div className="flex gap-3">
            <Link href="/account?tab=orders" className="h-12 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white flex items-center">My Orders</Link>
            <Link href="/support" className="h-12 px-6 rounded-xl border border-slate-700 text-sm font-bold text-white flex items-center">Contact Support</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
