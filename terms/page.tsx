import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";

const SECTIONS: [string, string][] = [
  ["1. The Marketplace", "Bazzaro is a multi-vendor marketplace connecting customers with independent sellers across Nepal. When you buy a product, your contract of sale is with the seller; Bazzaro facilitates payment, logistics coordination, and support."],
  ["2. Accounts", "You must provide accurate information and keep your password confidential. You are responsible for all activity under your account. One account per person for promotional abuse prevention."],
  ["3. Pricing & Payment", "All prices are in Nepalese Rupees (NPR) inclusive of applicable taxes unless stated. We support Cash on Delivery, eSewa and Khalti. Online payments are verified server-side; orders are only confirmed after successful verification."],
  ["4. Delivery", "Delivery timelines are estimates by zone and method. Risk of loss passes to you on delivery. Please inspect items on arrival and report issues within 48 hours."],
  ["5. Returns & Refunds", "Return windows are shown on each product page. Approved returns are picked up and refunded to the original payment method (or wallet/bank for COD) after quality check, typically within 5-7 business days."],
  ["6. Seller Terms", "Sellers must list genuine products, ship within 48 hours, honor return policies, and maintain accurate stock. Bazzaro charges the agreed commission per sale. Fraudulent sellers are removed and reported."],
  ["7. Prohibited Conduct", "Fraud, fake reviews, coupon abuse, chargeback abuse, harassment, and any illegal activity will result in suspension and legal action where applicable."],
  ["8. Liability", "To the maximum extent permitted by Nepali law, Bazzaro's liability is limited to the value of the affected order. We are not liable for indirect or consequential losses."],
  ["9. Governing Law", "These terms are governed by the laws of Nepal. Disputes will first be attempted to resolve via our support team, then through the courts of Kathmandu."],
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black text-white">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: January 2026</p>
        <div className="mt-6 space-y-4">
          {SECTIONS.map(([t, b]) => (
            <section key={t} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
              <h2 className="font-black text-white">{t}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{b}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
