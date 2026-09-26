"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Lock, Phone, UserPlus } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuthStore } from "@/lib/store";
import { errMsg } from "@/lib/client";

function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim() || undefined);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(errMsg(err, "Registration failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg font-black text-white">B</div>
          <h1 className="mt-3 text-2xl font-black text-white">Create Account</h1>
          <p className="mt-1 text-sm text-slate-400">Join Bazzaro and start shopping</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">{error}</div>}
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional, e.g. 98XXXXXXXX)"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars, letters + numbers)"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <button disabled={busy} className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" /> {busy ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account? <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-amber-400 hover:underline">Sign in</Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-500">
          Want to sell? <Link href="/vendor/register" className="font-bold text-amber-400 hover:underline">Register your shop</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
          <RegisterInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
