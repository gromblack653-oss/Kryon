import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  stock: number;
}

export interface CartLine {
  product: CartProduct;
  quantity: number;
}

interface CartState {
  items: CartLine[];
  add: (product: CartProduct, quantity?: number) => void;
  setQty: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product.id === product.id);
          if (existing) {
            const next = Math.min(existing.quantity + quantity, product.stock);
            return {
              items: s.items.map((i) =>
                i.product.id === product.id ? { product, quantity: next } : i,
              ),
            };
          }
          return { items: [...s.items, { product, quantity: Math.min(quantity, product.stock) }] };
        }),
      setQty: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.product.id === id
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.product.stock)) }
              : i,
          ),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'shopcore-cart' },
  ),
);

export const cartCount = (items: CartLine[]): number => items.reduce((s, i) => s + i.quantity, 0);
export const cartSubtotal = (items: CartLine[]): number =>
  items.reduce((s, i) => s + i.product.price_cents * i.quantity, 0);
