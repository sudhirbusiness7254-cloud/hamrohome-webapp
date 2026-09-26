"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn } from "lucide-react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuthStore } from "@/lib/store";
import { errMsg } from "@/lib/client";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      const dest = next !== "/" ? next : user.role === "admin" ? "/admin" : user.role === "vendor" ? "/vendor" : "/";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(errMsg(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg font-black text-white">B</div>
          <h1 className="mt-3 text-2xl font-black text-white">Welcome Back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to your Bazzaro account</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">{error}</div>}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="w-full h-12 rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 outline-none" />
          </div>
          <button disabled={busy} className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" /> {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          New to Bazzaro? <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-amber-400 hover:underline">Create account</Link>
        </p>
        <div className="mt-6 rounded-xl bg-slate-900/60 border border-slate-700/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Demo accounts (click to fill)</p>
          <div className="space-y-1.5 text-xs">
            <button onClick={() => fill("customer@bazzaro.com", "Customer@1234")} className="block w-full text-left text-slate-300 hover:text-amber-400">Customer — customer@bazzaro.com</button>
            <button onClick={() => fill("vendor@hulak.com", "Vendor@1234")} className="block w-full text-left text-slate-300 hover:text-amber-400">Vendor — vendor@hulak.com</button>
            <button onClick={() => fill("admin@bazzaro.com", "Admin@1234")} className="block w-full text-left text-slate-300 hover:text-amber-400">Admin — admin@bazzaro.com</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
          <LoginInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
