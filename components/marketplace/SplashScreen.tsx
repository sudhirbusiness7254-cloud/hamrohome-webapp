"use client";
import { useEffect, useState } from "react";

const NAME = "Bazzaro";

/**
 * Premium opening animation that plays once per browser session.
 * Reveals the Bazzaro brand with a mark pop, letter-by-letter wordmark,
 * a light sheen sweep, tagline and a loading bar, then curtains away.
 */
export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("bz_splash_seen") === "1";
    } catch { /* ignore */ }
    if (seen) return;

    setShow(true);
    document.body.style.overflow = "hidden";
    try { sessionStorage.setItem("bz_splash_seen", "1"); } catch { /* ignore */ }

    const leaveTimer = setTimeout(() => setLeaving(true), 2650);
    const doneTimer = setTimeout(() => {
      setShow(false);
      document.body.style.overflow = "";
    }, 3450);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div className={`splash-root ${leaving ? "is-leaving" : ""}`} aria-hidden="true">
      {/* Ambient glow orbs */}
      <div className="splash-glow pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-500/25 blur-[120px]" />
      <div className="splash-glow pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-orange-600/20 blur-[120px]" style={{ animationDelay: "1s" }} />

      {/* Floating sparkles */}
      {[
        { left: "18%", top: "30%", d: "0s", s: "h-2 w-2" },
        { left: "80%", top: "26%", d: "0.6s", s: "h-1.5 w-1.5" },
        { left: "28%", top: "72%", d: "1.1s", s: "h-1.5 w-1.5" },
        { left: "72%", top: "70%", d: "0.3s", s: "h-2 w-2" },
        { left: "50%", top: "18%", d: "0.9s", s: "h-1 w-1" },
      ].map((p, i) => (
        <span key={i} className={`splash-float absolute ${p.s} rounded-full bg-amber-300/80`} style={{ left: p.left, top: p.top, animationDelay: p.d }} />
      ))}

      <div className="relative flex flex-col items-center px-6">
        {/* Logo mark with pulsing rings */}
        <div className="relative mb-7 flex items-center justify-center">
          <span className="splash-ring h-24 w-24" />
          <span className="splash-ring h-24 w-24" style={{ animationDelay: "0.5s" }} />
          <div className="splash-mark relative h-20 w-20 rounded-[22px] bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 overflow-hidden">
            <span className="text-4xl font-black text-white drop-shadow">B</span>
            {/* light sheen sweep */}
            <span className="splash-sheen absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>

        {/* Wordmark — letter by letter */}
        <h1 className="flex text-5xl sm:text-6xl font-black tracking-tight" style={{ perspective: "600px" }}>
          {NAME.split("").map((ch, i) => (
            <span
              key={i}
              className={`splash-letter ${i < 4 ? "text-amber-400" : "text-white"}`}
              style={{ animationDelay: `${0.45 + i * 0.08}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        {/* Underline */}
        <div className="splash-underline mt-3 h-1 w-40 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-transparent" />

        {/* Tagline */}
        <p className="splash-tagline mt-4 text-[11px] sm:text-xs font-bold uppercase text-slate-400" style={{ letterSpacing: "0.42em" }}>
          Shop Nepal · Delivered Fast
        </p>

        {/* Loading bar */}
        <div className="mt-9 h-[3px] w-52 overflow-hidden rounded-full bg-white/10">
          <div className="splash-bar h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
        </div>
      </div>
    </div>
  );
}
