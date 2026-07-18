import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX = 4;

interface CompareState {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  isFull: () => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return { ids: s.ids.filter((x) => x !== id) };
          if (s.ids.length >= MAX) return s;
          return { ids: [...s.ids, id] };
        }),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
      isFull: () => get().ids.length >= MAX,
    }),
    { name: 'shopcore-compare' },
  ),
);

export const COMPARE_MAX = MAX;
