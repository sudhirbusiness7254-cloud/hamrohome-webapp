"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Building2, Landmark, ClipboardCheck, Check, ChevronLeft } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { api, errMsg } from "@/lib/client";
import { useAuthStore } from "@/lib/store";

const STEPS = [
  { n: 1, label: "Shop", icon: Store },
  { n: 2, label: "Business", icon: Building2 },
  { n: 3, label: "Bank", icon: Landmark },
  { n: 4, label: "Review", icon: ClipboardCheck },
];

export default function VendorRegisterPage() {
  const router = useRouter();
  const { user, loaded } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ shopName: "", description: "", businessName: "", panVatNumber: "", bankName: "", bankAccount: "", bankHolder: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setError("");
    if (form.shopName.trim().length < 3) { setError("Shop name must be at least 3 characters"); setStep(1); return; }
    setBusy(true);
    try {
      await api("/api/vendor/register", { method: "POST", body: form });
      setDone(true);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return <div className="min-h-screen bg-slate-950"><Header /><div className="py-20 text-center text-slate-400">Loading...</div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100"><Header />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <Store className="h-14 w-14 text-amber-400 mx-auto" />
          <h1 className="mt-4 text-2xl font-black text-white">Sell on Bazzaro</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in or create an account first, then register your shop.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/login?next=/vendor/register" className="h-12 px-8 rounded-xl border border-slate-700 text-sm font-bold text-white hover:bg-slate-800 flex items-center">Sign In</Link>
            <Link href="/register?next=/vendor/register" className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white flex items-center">Create Account</Link>
          </div>
        </main><Footer />
      </div>
    );
  }

  if (user.role === "vendor") {
    router.push("/vendor");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl lg:text-3xl font-black text-white">Open Your Shop on <span className="gradient-text">Bazzaro</span></h1>
          <p className="mt-2 text-sm text-slate-400">Reach millions of customers across Nepal. Zero listing fees.</p>
        </div>

        <div className="mt-6 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${step >= s.n ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                  {step > s.n ? <Check className="h-4 w-4" /> : s.n}
                </span>
                <span className={`text-xs font-bold hidden sm:block ${step >= s.n ? "text-white" : "text-slate-500"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 rounded ${step > s.n ? "bg-amber-500" : "bg-slate-800"}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">{error}</div>}

        {done ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center scale-pop">
            <span className="h-16 w-16 mx-auto rounded-full bg-emerald-500 flex items-center justify-center"><Check className="h-8 w-8 text-white" /></span>
            <h2 className="mt-4 text-xl font-black text-white">Application Submitted!</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">Our team will review <b className="text-white">{form.shopName}</b> within 1-2 business days. You will be notified by email and in-app notification.</p>
            <Link href="/vendor" className="mt-6 inline-block h-12 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white leading-[3rem]">Go to Vendor Dashboard</Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-black text-white">Shop Details</h3>
                <div><label className="text-xs font-bold text-slate-400">Shop Name *</label><input value={form.shopName} onChange={set("shopName")} placeholder="e.g. Himalaya Handicrafts" className={cls} /></div>
                <div><label className="text-xs font-bold text-slate-400">Shop Description</label><textarea value={form.description} onChange={set("description")} rows={4} placeholder="What do you sell? Where are you based?" className={`${cls} !h-auto py-3`} /></div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-black text-white">Business & KYC <span className="text-xs font-normal text-slate-500">(optional for now)</span></h3>
                <div><label className="text-xs font-bold text-slate-400">Registered Business Name</label><input value={form.businessName} onChange={set("businessName")} placeholder="e.g. Himalaya Handicrafts Pvt. Ltd." className={cls} /></div>
                <div><label className="text-xs font-bold text-slate-400">PAN / VAT Number</label><input value={form.panVatNumber} onChange={set("panVatNumber")} placeholder="e.g. 123456789" className={cls} /></div>
                <p className="text-xs text-slate-500">You can upload KYC documents later from vendor settings. PAN/VAT helps with faster payouts.</p>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-black text-white">Bank Details <span className="text-xs font-normal text-slate-500">(for payouts)</span></h3>
                <div><label className="text-xs font-bold text-slate-400">Bank Name</label><input value={form.bankName} onChange={set("bankName")} placeholder="e.g. NMB Bank" className={cls} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-400">Account Number</label><input value={form.bankAccount} onChange={set("bankAccount")} placeholder="e.g. 001234567890" className={cls} /></div>
                  <div><label className="text-xs font-bold text-slate-400">Account Holder</label><input value={form.bankHolder} onChange={set("bankHolder")} placeholder="Full name" className={cls} /></div>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3">
                <h3 className="font-black text-white">Review Application</h3>
                {[
                  ["Shop Name", form.shopName || "—"],
                  ["Description", form.description || "—"],
                  ["Business", form.businessName || "—"],
                  ["PAN/VAT", form.panVatNumber || "—"],
                  ["Bank", form.bankName ? `${form.bankName} • ${form.bankAccount} • ${form.bankHolder}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 text-sm">
                    <span className="text-slate-500 text-xs font-bold">{k}: </span><span className="text-slate-200">{v}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500">By submitting, you agree to the Bazzaro Seller Terms: genuine products only, ship within 48 hours, and honor the return policy.</p>
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="h-11 px-6 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              {step < 4 ? (
                <button onClick={() => { if (step === 1 && form.shopName.trim().length < 3) { setError("Shop name must be at least 3 characters"); return; } setError(""); setStep(step + 1); }}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white">Continue</button>
              ) : (
                <button onClick={submit} disabled={busy} className="h-11 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white disabled:opacity-50">
                  {busy ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const cls = "mt-1 w-full h-12 rounded-xl bg-slate-900 border border-slate-700 px-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";
