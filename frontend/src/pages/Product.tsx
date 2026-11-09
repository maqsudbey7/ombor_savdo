import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Layers, Package, ShoppingCart, Truck } from 'lucide-react';
import { useProduct } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/cartSlice';
import { setCartOpen, toast } from '../store/uiSlice';
import { fmt } from '../lib/format';
import { discountPct, nextTier, priceFor } from '../lib/pricing';
import type { Product as P } from '../types/api';
import { Empty, ProductImage, QtyInput, Spinner, StockBadge } from '../components/ui';

export default function ProductPage() {
  const id = Number(useParams().id);
  const { data, isPending, error } = useProduct(id);
  if (isPending) return <Spinner />;
  if (error) return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Empty icon={Package} title={error.message}><Link to="/katalog" className="btn-primary">Katalogga qaytish</Link></Empty>
    </div>
  );
  return <ProductView key={data.id} p={data} />;
}

function ProductView({ p }: { p: P }) {
  const [qty, setQty] = useState(p.moq);
  const dispatch = useAppDispatch();
  const price = priceFor(p, qty);
  const nt = nextTier(p, qty);
  const rows = [{ min_qty: p.moq, price: p.base_price }, ...p.tiers];
  const canBuy = p.stock >= p.moq && qty <= p.stock;

  const add = (openCart = false) => {
    dispatch(addToCart({ product: p, qty }));
    if (openCart) dispatch(setCartOpen(true)); else dispatch(toast(`${p.name} savatga qo‘shildi`));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/katalog" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ChevronLeft size={16} /> Katalog</Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-2">
        <ProductImage product={p} className="aspect-square w-full rounded-3xl [&>span]:text-8xl" />
        <div>
          <div className="text-sm font-medium text-brand-600">{p.category?.icon} {p.category?.name}</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2"><StockBadge p={p} /><span className="badge bg-slate-100 text-slate-600">SKU: {p.sku}</span></div>
          <p className="mt-5 text-slate-600">{p.description}</p>

          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold"><Layers size={16} className="text-brand-600" /> Ulgurji narxlar</div>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((t, i) => {
                  const to = rows[i + 1] ? rows[i + 1].min_qty - 1 : null;
                  return (
                    <tr key={t.min_qty} className={price === t.price ? 'bg-brand-50/70 font-semibold text-brand-800' : ''}>
                      <td className="px-5 py-2.5">{t.min_qty}{to ? `–${to}` : '+'} {p.unit}</td>
                      <td className="px-5 py-2.5 text-right">{fmt(t.price)}</td>
                      <td className="w-20 px-5 py-2.5 text-right text-emerald-600">{i > 0 && `−${discountPct(p, t.price)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card mt-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="label">Miqdor ({p.unit})</div>
                <QtyInput value={qty} min={p.moq} max={Math.max(p.moq, p.stock)} onChange={setQty} />
                <div className="mt-1.5 text-xs text-slate-500">Minimal buyurtma: {p.moq} {p.unit}{p.pack_size > 1 && ` · 1 ${p.unit} = ${p.pack_size} dona`}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">{fmt(price)} × {qty}</div>
                <div className="text-3xl font-extrabold">{fmt(price * qty)}</div>
              </div>
            </div>
            {nt && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">💡 {nt.min_qty} {p.unit} dan olsangiz, narx {fmt(nt.price)} bo‘ladi</div>}
            <div className="mt-5 flex gap-3">
              <button className="btn-primary flex-1 py-3" disabled={!canBuy} onClick={() => add()}><ShoppingCart size={18} /> Savatga qo‘shish</button>
              <button className="btn-ghost py-3" disabled={!canBuy} onClick={() => add(true)}>Hoziroq olish</button>
            </div>
            {p.stock < p.moq && <div className="mt-3 text-sm text-rose-600">Bu mahsulot hozircha omborda yetarli emas.</div>}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Truck size={16} /> Toshkent bo‘ylab yetkazish 24 soat ichida</div>
        </div>
      </div>
    </div>
  );
}
