import type { PriceTier, Product } from '../types/api';

type Priced = Pick<Product, 'base_price' | 'tiers'>;

/** Miqdorga mos eng yaxshi ulgurji narx (backend `Product.price_for` bilan bir xil). */
export function priceFor(p: Priced, qty: number): number {
  let price = p.base_price;
  for (const t of p.tiers) if (qty >= t.min_qty && t.price < price) price = t.price;
  return price;
}

/** Keyingi arzonroq pog‘ona (agar bo‘lsa). */
export function nextTier(p: Priced, qty: number): PriceTier | undefined {
  const current = priceFor(p, qty);
  return p.tiers.find((t) => t.min_qty > qty && t.price < current);
}

export const discountPct = (p: Priced, price: number) => Math.round((1 - price / p.base_price) * 100);
