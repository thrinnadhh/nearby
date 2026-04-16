import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

/** What's written to disk — productId + qty only. No prices. */
interface CartEntry {
  productId: string;
  qty: number;
}

interface CartState {
  shopId: string | null;
  /** Persisted: lightweight refs (no prices). Source of truth for count/badge. */
  entries: CartEntry[];
  /** In-memory only: enriched with full Product data (including price).
   *  Populated when addItem is called. Cleared on app restart until
   *  enrichItems() is called (e.g. from the cart screen). */
  items: CartItem[];
}

interface CartActions {
  addItem: (product: Product, shopId: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  /** Called by the cart screen after fetching fresh product data.
   *  Rebuilds items from entries with current server prices. */
  enrichItems: (products: Product[]) => void;
}

const initialState: CartState = {
  items: [],
  entries: [],
  shopId: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (product, shopId) => {
        const { entries, items, shopId: current } = get();
        const isDifferentShop = current !== null && current !== shopId;

        const baseEntries = isDifferentShop ? [] : entries;
        const baseItems = isDifferentShop ? [] : items;

        const existingEntry = baseEntries.find((e) => e.productId === product.id);
        const newEntries: CartEntry[] = existingEntry
          ? baseEntries.map((e) =>
              e.productId === product.id ? { ...e, qty: e.qty + 1 } : e
            )
          : [...baseEntries, { productId: product.id, qty: 1 }];

        const existingItem = baseItems.find((i) => i.product.id === product.id);
        const newItems: CartItem[] = existingItem
          ? baseItems.map((i) =>
              i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
            )
          : [...baseItems, { product, qty: 1 }];

        set({ shopId, entries: newEntries, items: newItems });
      },

      removeItem: (productId) =>
        set((state) => {
          const newEntries = state.entries.filter((e) => e.productId !== productId);
          const newItems = state.items.filter((i) => i.product.id !== productId);
          return {
            entries: newEntries,
            items: newItems,
            shopId: newEntries.length === 0 ? null : state.shopId,
          };
        }),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          entries: state.entries.map((e) =>
            e.productId === productId ? { ...e, qty } : e
          ),
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
        }));
      },

      enrichItems: (products) => {
        const { entries } = get();
        const productMap = new Map(products.map((p) => [p.id, p]));
        // Drop any entries whose product was deleted or is beyond the fetch limit.
        // This prevents ₹0 ghost line items in the cart total.
        const resolvedEntries = entries.filter((e) => productMap.has(e.productId));
        set({
          entries: resolvedEntries,
          items: resolvedEntries.map((entry) => ({
            // Non-null assertion safe: filtered to only entries with a resolved product above.
            product: productMap.get(entry.productId)!,
            qty: entry.qty,
          })),
        });
      },

      clearCart: () => set(initialState),
    }),
    {
      name: 'nearby-cart',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist lightweight entries — prices are never written to disk.
      partialize: (state) => ({
        shopId: state.shopId,
        entries: state.entries,
      }),
      // Migrate from v0 (old format: { items: CartItem[], shopId }) → v1
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          const old = persistedState as {
            items?: Array<{ product: { id: string }; qty: number }>;
            shopId?: string | null;
          };
          return {
            shopId: old.shopId ?? null,
            entries: (old.items ?? []).map((i) => ({
              productId: i.product.id,
              qty: i.qty,
            })),
          };
        }
        return persistedState as CartState;
      },
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

/** Total price in paise — computed from in-memory items (current session prices). */
export const selectCartTotal = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

/** Total item count — computed from persisted entries (survives app restart). */
export const selectCartCount = (state: CartState): number =>
  state.entries.reduce((sum, e) => sum + e.qty, 0);
