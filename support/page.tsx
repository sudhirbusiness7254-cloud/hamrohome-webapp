import type { Metadata } from "next";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { SupportContact } from "@/components/marketplace/SupportContact";
import { getSessionUser } from "@/lib/auth";
import { SUPPORT_TICKET_URL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Support & Contact | Bazzaro",
  description: "Contact Bazzaro support through WhatsApp, phone, or email. Open a support ticket for order help.",
};

export default async function SupportPage() {
  const user = await getSessionUser();
  const ticketHref = user ? "/account?tab=support" : SUPPORT_TICKET_URL;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <SupportContact ticketHref={ticketHref} />
      <Footer showNewsletter={false} />
    </div>
  );
}
