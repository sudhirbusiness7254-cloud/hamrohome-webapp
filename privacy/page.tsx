import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: January 2026</p>
        <div className="mt-6 space-y-5 text-sm text-slate-300 leading-relaxed">
          <p>Bazzaro (&quot;we&quot;, &quot;our&quot;) operates Nepal&apos;s multi-vendor marketplace. This policy explains what data we collect and how we use it.</p>
          <Section title="1. Information We Collect">
            Account details (name, email, phone), delivery addresses, order history, payment references (we never store wallet PINs or card numbers), device and usage data, and support communications.
          </Section>
          <Section title="2. How We Use It">
            To process orders, arrange delivery, verify payments server-side, prevent fraud, provide support, send order notifications, and improve our services. Marketing messages are only sent with your consent.
          </Section>
          <Section title="3. Sharing">
            Your order details are shared with the relevant seller and delivery partner to fulfil your order. Payment processing is handled by licensed wallets (eSewa, Khalti) under their own policies. We never sell your personal data.
          </Section>
          <Section title="4. Security">
            Passwords are hashed with scrypt, sessions use signed HTTP-only cookies, and payment callbacks are HMAC-verified. Access to admin tools is role-based and audit-logged.
          </Section>
          <Section title="5. Your Rights">
            You may access, correct, or delete your data at any time from your account page or by contacting iamsudhiryadav72544@gmail.com or WhatsApp +977 9700277722. You may also request a copy of your data.
          </Section>
          <Section title="6. Contact">
            Bazzaro Support — WhatsApp: +977 9700277722 — Email: iamsudhiryadav72544@gmail.com. Support contact: Sudhir Yadav.
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
      <h2 className="font-black text-white">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
