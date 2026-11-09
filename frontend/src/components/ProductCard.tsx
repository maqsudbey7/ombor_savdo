import { Link } from 'react-router-dom';
import { ShoppingCart, TrendingDown } from 'lucide-react';
import type { Product } from '../types/api';
import { useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/cartSlice';
import { toast } from '../store/uiSlice';
import { fmt } from '../lib/format';
import { discountPct } from '../lib/pricing';
import { ProductImage, StockBadge } from './ui';

export default function ProductCard({ p }: { p: Product }) {
  const dispatch = useAppDispatch();
  const best = p.tiers.at(-1);
  const add = () => {
    dispatch(addToCart({ product: p, qty: p.moq }));
    dispatch(toast(`${p.name} savatga qo‘shildi`));
  };
  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/mahsulot/${p.id}`} className="relative block overflow-hidden">
        <ProductImage product={p} className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]" />
        {best && (
          <span className="badge absolute left-3 top-3 bg-white/90 text-emerald-700 shadow-sm backdrop-blur">
            <TrendingDown size={12} /> −{discountPct(p, best.price)}% ulgurji
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs font-medium text-slate-400">{p.category?.name} · {p.sku}</div>
        <Link to={`/mahsulot/${p.id}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand-600">{p.name}</Link>
        <div className="mt-2"><StockBadge p={p} /></div>
        <div className="mt-auto pt-4">
          <div className="text-lg font-bold">{fmt(p.base_price)}<span className="text-sm font-medium text-slate-400"> / {p.unit}</span></div>
          <div className="h-4 text-xs text-emerald-600">{best && `${best.min_qty}+ ${p.unit} dan: ${fmt(best.price)}`}</div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">Min: {p.moq} {p.unit}</span>
            <button className="btn-primary px-3 py-2" disabled={p.stock < p.moq} onClick={add}><ShoppingCart size={16} /> Savatga</button>
          </div>
        </div>
      </div>
    </div>
  );
}
