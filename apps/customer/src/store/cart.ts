import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  /** shopId of the shop currently in the cart — enforces same-shop rule */
  shopId: string | null;
}

interface CartActions {
  /** Add one unit of product. Clears cart automatically if from a different shop. */
  addItem: (product: Product, shopId: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
}

const initialState: CartState = {
  items: [],
  shopId: null,
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (product, shopId) => {
        const { items, shopId: current } = get();
        // Different shop — clear and start fresh (user confirmed or warned upstream)
        const base = current && current !== shopId ? [] : items;
        const existing = base.find((i) => i.product.id === product.id);
        set({
          shopId,
          items: existing
            ? base.map((i) =>
                i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
              )
            : [...base, { product, qty: 1 }],
        });
      },

      removeItem: (productId) =>
        set((state) => {
          const next = state.items.filter((i) => i.product.id !== productId);
          return { items: next, shopId: next.length === 0 ? null : state.shopId };
        }),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
        }));
      },

      clearCart: () => set(initialState),
    }),
    {
      name: 'nearby-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

/** Total price in paise */
export const selectCartTotal = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

/** Total item count */
export const selectCartCount = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.qty, 0);
