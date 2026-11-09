import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../types/api';
import { load } from '../lib/storage';
import { priceFor } from '../lib/pricing';
import type { RootState } from '.';

export interface CartItem { product: Product; qty: number }
export interface CartState { items: CartItem[] }

const initialState: CartState = load<CartState>('cart', { items: [] });

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (s, { payload }: PayloadAction<CartItem>) => {
      const ex = s.items.find((i) => i.product.id === payload.product.id);
      const qty = Math.min(payload.product.stock, (ex?.qty ?? 0) + payload.qty);
      if (ex) { ex.product = payload.product; ex.qty = qty; } else s.items.push({ product: payload.product, qty });
    },
    setQty: (s, { payload }: PayloadAction<{ id: number; qty: number }>) => {
      const it = s.items.find((i) => i.product.id === payload.id);
      if (it) it.qty = payload.qty;
    },
    removeFromCart: (s, { payload }: PayloadAction<number>) => {
      s.items = s.items.filter((i) => i.product.id !== payload);
    },
    clearCart: (s) => { s.items = []; },
  },
});

export const { addToCart, setQty, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

export const selectCartItems = (s: RootState) => s.cart.items;
export const selectCartTotals = createSelector(selectCartItems, (items) => {
  let total = 0;
  let base = 0;
  for (const i of items) {
    total += priceFor(i.product, i.qty) * i.qty;
    base += i.product.base_price * i.qty;
  }
  return { total, saved: base - total, count: items.length };
});
