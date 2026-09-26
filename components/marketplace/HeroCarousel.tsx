"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Headphones, ShieldCheck, Sparkles, Truck } from "lucide-react";

export type HeroSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image?: string | null;
  accent: string;
  cta: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
};

const DEFAULT_SLIDES: HeroSlide[] = [{
  id: "bazzaro-default",
  badge: "The Bazzaro edit",
  title: "A little more of what you love.",
  subtitle: "Thoughtful finds for every day, from the sellers who know Nepal best.",
  image: "/images/hero-marketplace.jpg",
  accent: "from-amber-400 to-orange-500",
  cta: { label: "Explore collection", href: "/products" },
  ctaSecondary: { label: "Shop all products", href: "/products" },
}];

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: "Shop with confidence", note: "Verified local sellers" },
  { icon: Truck, title: "Made for Nepal", note: "Delivery across districts" },
  { icon: Sparkles, title: "Good finds", note: "New discoveries every day" },
  { icon: Headphones, title: "We're here to help", note: "Support when you need it" },
];

function titleParts(title: string): { first: string; accent: string } {
  const explicit = title.split("\n");
  if (explicit.length > 1) return { first: explicit[0], accent: explicit.slice(1).join(" ") };
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return { first: words.slice(0, -1).join(" "), accent: words.at(-1) || "" };
  return { first: words.slice(0, -2).join(" "), accent: words.slice(-2).join(" ") };
}

export function HeroCarousel({ slides }: { slides?: HeroSlide[] }) {
  const list = slides && slides.length ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setAnimationKey((x) => x + 1);
  }, []);
  const next = useCallback(() => goTo((current + 1) % list.length), [current, list.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + list.length) % list.length), [current, list.length, goTo]);

  useEffect(() => {
    if (list.length < 2) return;
    const timer = window.setInterval(next, 6500);
    return () => window.clearInterval(timer);
  }, [next, list.length]);

  const slide = list[current] || list[0];
  const heading = titleParts(slide.title);
  const image = slide.image || "/images/hero-marketplace.jpg";

  return <section aria-label="Featured Bazzaro campaigns" className="relative">
    <div className="relative min-h-[490px] lg:min-h-[550px] overflow-hidden bg-[#0a1524]">
      <div key={`image-${slide.id}-${animationKey}`} className="absolute inset-0 hero-slide-enter">
        <Image src={image} alt={slide.title} fill priority={current === 0} unoptimized={image.startsWith("https://")}
          sizes="100vw" className="object-cover object-[68%_center] md:object-center" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#06101f]/95 via-[#081322]/90 md:via-[#081322]/80 to-[#081322]/35 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07101e]/60 via-transparent to-[#07101e]/10" />
      <div className="absolute -bottom-52 -left-52 h-96 w-96 rounded-full bg-amber-500/10 blur-[110px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl min-h-[490px] lg:min-h-[550px] px-10 sm:px-14 lg:px-16 flex flex-col justify-center py-12">
        <div key={`text-${slide.id}-${animationKey}`} className="slide-in-left max-w-[620px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> {slide.badge}
          </span>
          <h1 className="mt-6 text-[clamp(2.5rem,6vw,5.1rem)] leading-[1.06] font-black tracking-[-0.045em] text-white drop-shadow-lg">
            {heading.first}<br /><span className="gradient-text">{heading.accent}</span>
          </h1>
          <p className="mt-5 text-sm sm:text-base lg:text-lg leading-relaxed text-slate-200 max-w-[465px] drop-shadow-sm">{slide.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={slide.cta.href} className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${slide.accent} px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20 hover:scale-[1.03] active:scale-95 transition-transform`}>
              {slide.cta.label} <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href={slide.ctaSecondary.href} className="inline-flex items-center rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 hover:border-white/60 transition-colors">
              {slide.ctaSecondary.label}
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-2 text-xs font-medium text-slate-300/80"><ShieldCheck className="h-4 w-4 text-amber-400" /> Real sellers. Real finds. Made for Nepal.</div>
        </div>
      </div>

      {list.length > 1 && <>
        <button type="button" onClick={prev} aria-label="Previous campaign" className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full border border-white/20 bg-slate-950/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-amber-500 hover:text-slate-950 transition-all"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={next} aria-label="Next campaign" className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full border border-white/20 bg-slate-950/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-amber-500 hover:text-slate-950 transition-all"><ChevronRight className="h-5 w-5" /></button>
        <div className="absolute bottom-5 right-7 sm:right-14 z-20 flex gap-2 items-center">
          {list.map((item, i) => <button key={item.id} type="button" onClick={() => goTo(i)} aria-label={`View campaign ${i + 1}`} aria-current={i === current ? "true" : undefined} className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${i === current ? "w-12 bg-white/30" : "w-5 bg-white/30 hover:bg-white/70"}`}>
            {i === current && <span key={animationKey} className="absolute inset-y-0 left-0 bg-amber-400 hero-progress" />}
          </button>)}
        </div>
      </>}
    </div>

    <div className="border-y border-slate-700/60 bg-[#101e30]">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TRUST_ITEMS.map((item) => <div key={item.title} className="flex items-center justify-center lg:justify-start gap-2.5">
          <span className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0"><item.icon className="h-4 w-4 text-amber-400" /></span>
          <span><span className="block text-[11px] sm:text-xs font-bold text-white">{item.title}</span><span className="block text-[10px] text-slate-400">{item.note}</span></span>
        </div>)}
      </div>
    </div>
  </section>;
}
