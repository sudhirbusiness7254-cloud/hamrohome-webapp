"use client";
import { create } from "zustand";
import { api } from "./client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "vendor" | "admin";
  adminTier: string | null;
};

// --- auth -------------------------------------------------------------------
type AuthState = {
  user: AuthUser | null;
  loaded: boolean;
  me: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loaded: false,
  me: async () => {
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/me");
      set({ user: data.user, loaded: true });
      return data.user;
    } catch {
      set({ user: null, loaded: true });
      return null;
    }
  },
  login: async (email, password) => {
    const data = await api<{ user: AuthUser }>("/api/auth/login", { method: "POST", body: { email, password } });
    set({ user: data.user, loaded: true });
    return data.user;
  },
  register: async (name, email, password, phone) => {
    const data = await api<{ user: AuthUser }>("/api/auth/register", { method: "POST", body: { name, email, password, phone } });
    set({ user: data.user, loaded: true });
    return data.user;
  },
  logout: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    set({ user: null, loaded: true });
  },
  setUser: (u) => set({ user: u }),
}));

// --- cart -------------------------------------------------------------------
type CartState = {
  count: number;
  refresh: () => Promise<void>;
  add: (productId: string, variantId?: string | null, qty?: number) => Promise<void>;
  setQty: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useCartStore = create<CartState>((set, get) => ({
  count: 0,
  refresh: async () => {
    try {
      const data = await api<{ count: number }>("/api/cart");
      set({ count: data.count });
    } catch { /* ignore */ }
  },
  add: async (productId, variantId, qty = 1) => {
    await api("/api/cart", { method: "POST", body: { productId, variantId: variantId ?? null, qty } });
    await get().refresh();
  },
  setQty: async (itemId, qty) => {
    if (qty <= 0) { await get().remove(itemId); return; }
    await api(`/api/cart/${itemId}`, { method: "PATCH", body: { qty } });
    await get().refresh();
  },
  remove: async (itemId) => {
    await api(`/api/cart/${itemId}`, { method: "DELETE" });
    await get().refresh();
  },
  clear: async () => {
    await api("/api/cart", { method: "DELETE" });
    set({ count: 0 });
  },
}));

// --- wishlist ---------------------------------------------------------------
type WishState = {
  ids: string[];
  refresh: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  has: (productId: string) => boolean;
};

export const useWishlistStore = create<WishState>((set, get) => ({
  ids: [],
  refresh: async () => {
    try {
      const data = await api<{ ids: string[] }>("/api/wishlist");
      set({ ids: data.ids });
    } catch { /* ignore */ }
  },
  toggle: async (productId) => {
    const data = await api<{ active: boolean }>("/api/wishlist", { method: "POST", body: { productId } });
    const ids = get().ids;
    set({ ids: data.active ? [...ids, productId] : ids.filter((i) => i !== productId) });
    return data.active;
  },
  has: (productId) => get().ids.includes(productId),
}));
