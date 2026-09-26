"use client";
import { useEffect, type ReactNode } from "react";
import { useAuthStore, useCartStore, useWishlistStore } from "@/lib/store";
import { SplashScreen } from "@/components/marketplace/SplashScreen";
import { SupportWidget } from "@/components/marketplace/SupportWidget";

export function Providers({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.me);
  const refreshCart = useCartStore((s) => s.refresh);
  const refreshWish = useWishlistStore((s) => s.refresh);

  useEffect(() => {
    (async () => {
      const user = await me();
      await refreshCart();
      if (user) await refreshWish();
    })();
  }, [me, refreshCart, refreshWish]);

  return (
    <>
      <SplashScreen />
      {children}
      <SupportWidget />
    </>
  );
}
