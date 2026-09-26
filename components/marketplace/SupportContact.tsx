import Link from "next/link";
import { ArrowUpRight, Clock3, Headphones, Mail, MapPin, MessageCircle, Phone, ShieldCheck, TicketCheck } from "lucide-react";
import {
  SUPPORT_EMAIL, SUPPORT_EMAIL_URL, SUPPORT_PHONE_DISPLAY, SUPPORT_CALL_URL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/contact";

export function SupportContact({ ticketHref }: { ticketHref: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 lg:px-6 py-10 sm:py-16">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-700 bg-gradient-to-br from-slate-900 via-[#111e31] to-[#172439] p-7 sm:p-12">
        <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-[90px] pointer-events-none" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-300"><Headphones className="h-3.5 w-3.5" /> Bazzaro support</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.05]">We&apos;re here<br /><span className="gradient-text">to help.</span></h1>
          <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">A question about an order, a return, or shopping on Bazzaro? Choose the contact method that works best for you.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-black text-[#082d17] hover:brightness-110 transition"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
            <Link href={ticketHref} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-bold text-white hover:bg-white/10 transition"><TicketCheck className="h-4 w-4" /> Open a support ticket</Link>
          </div>
        </div>
      </div>

      <section className="mt-7 grid gap-4 md:grid-cols-3" aria-label="Contact options">
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-700 bg-slate-900/75 p-6 transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-900">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400"><MessageCircle className="h-6 w-6" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Fastest response</p>
          <h2 className="mt-1 text-lg font-black text-white">WhatsApp</h2>
          <p className="mt-1 text-sm text-slate-400">{SUPPORT_PHONE_DISPLAY}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-400">Start a chat <ArrowUpRight className="h-3.5 w-3.5" /></span>
        </a>

        <a href={SUPPORT_EMAIL_URL} className="group rounded-2xl border border-slate-700 bg-slate-900/75 p-6 transition hover:-translate-y-1 hover:border-amber-400/50 hover:bg-slate-900">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400"><Mail className="h-6 w-6" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Email us</p>
          <h2 className="mt-1 text-lg font-black text-white">Send an email</h2>
          <p className="mt-1 text-sm text-slate-400 break-all">{SUPPORT_EMAIL}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-amber-400">Compose email <ArrowUpRight className="h-3.5 w-3.5" /></span>
        </a>

        <a href={SUPPORT_CALL_URL} className="group rounded-2xl border border-slate-700 bg-slate-900/75 p-6 transition hover:-translate-y-1 hover:border-sky-400/50 hover:bg-slate-900">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-400"><Phone className="h-6 w-6" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Call or save our number</p>
          <h2 className="mt-1 text-lg font-black text-white">Phone</h2>
          <p className="mt-1 text-sm text-slate-400">{SUPPORT_PHONE_DISPLAY}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-sky-400">Call now <ArrowUpRight className="h-3.5 w-3.5" /></span>
        </a>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-400" /><h2 className="font-black text-white">Already have an order?</h2></div>
          <p className="mt-2 text-sm text-slate-400">For order changes, delivery updates or returns, include your order number so we can help you faster.</p>
          <Link href={ticketHref} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300">Contact support about an order <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-amber-400" /><h2 className="font-black text-white">Direct support</h2></div>
          <p className="mt-2 text-sm text-slate-400">Support and contact: <span className="font-semibold text-slate-200">Sudhir Yadav</span>. Send a WhatsApp message or email and include the details of your question.</p>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-amber-400" /> Bazzaro · Nepal</p>
        </div>
      </section>
      <div className="mt-7 text-center text-xs text-slate-600">Bazzaro support · Made by Sudhir Yadav</div>
    </main>
  );
}
