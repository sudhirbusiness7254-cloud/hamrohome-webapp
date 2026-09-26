"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Mail, MessageCircle, TicketCheck, X } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  SUPPORT_EMAIL, SUPPORT_EMAIL_URL, SUPPORT_PHONE_DISPLAY,
  SUPPORT_TICKET_URL, SUPPORT_WHATSAPP_URL,
} from "@/lib/contact";

/** Site-wide quick access to the Bazzaro support contact channels. */
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);
  const ticketHref = user ? "/account?tab=support" : SUPPORT_TICKET_URL;

  useEffect(() => {
    setMounted(true);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!mounted) return null;
  return (
    <div className="fixed bottom-5 right-4 sm:bottom-7 sm:right-7 z-[55] flex flex-col items-end gap-3">
      {open && <div role="dialog" aria-label="Bazzaro support contact options" className="w-[min(350px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 support-panel-enter">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-4">
          <div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white"><Headphones className="h-5 w-5" /></span><div><h2 className="text-sm font-black text-slate-950">Need a hand?</h2><p className="mt-0.5 text-xs text-slate-900/75">Choose how to reach Sudhir.</p></div></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close support panel" className="rounded-lg p-1.5 text-slate-950/70 hover:bg-black/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 p-3">
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 hover:bg-emerald-500/15 transition-colors">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white"><MessageCircle className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">WhatsApp support</span><span className="block text-[11px] text-slate-400">{SUPPORT_PHONE_DISPLAY}</span></span><span className="text-[10px] font-bold text-emerald-300">Chat →</span>
          </a>
          <a href={SUPPORT_EMAIL_URL} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 px-3.5 py-3 hover:border-amber-500/40 transition-colors">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-400"><Mail className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">Email support</span><span className="block truncate text-[11px] text-slate-400">{SUPPORT_EMAIL}</span></span><span className="text-[10px] font-bold text-amber-300">Email →</span>
          </a>
          <Link href={ticketHref} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 px-3.5 py-3 hover:border-sky-500/40 transition-colors">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/15 text-sky-400"><TicketCheck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">Support ticket</span><span className="block text-[11px] text-slate-400">{user ? "Continue your conversation" : "Sign in to track a request"}</span></span><span className="text-[10px] font-bold text-sky-300">Open →</span>
          </Link>
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-center text-[10px] text-slate-500">Support by Sudhir Yadav</div>
      </div>}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close support options" : "Open support options"} aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/25 hover:scale-[1.03] active:scale-95 transition-all">
        {open ? <X className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}<span className="hidden sm:inline">{open ? "Close" : "Need help?"}</span>
      </button>
    </div>
  );
}
