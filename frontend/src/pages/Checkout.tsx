import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import { useCreateOrder } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearCart, selectCartTotals } from '../store/cartSlice';
import { toast } from '../store/uiSlice';
import { fmt, PAYMENT } from '../lib/format';
import { priceFor } from '../lib/pricing';
import type { Order, PaymentMethod } from '../types/api';
import { Empty } from '../components/ui';

export default function Checkout() {
  const user = useAppSelector((s) => s.auth.user);
  const items = useAppSelector((s) => s.cart.items);
  const totals = useAppSelector(selectCartTotals);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState({ address: '', note: '', payment_method: 'cash' as PaymentMethod });
  const [done, setDone] = useState<Order | null>(null);

  if (!user) return <Navigate to="/kirish?next=/rasmiylashtirish" replace />;
  if (done) return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Empty icon={CheckCircle2} title={`Buyurtma #${done.id} qabul qilindi!`} text={`Jami: ${fmt(done.total)}. Menejerimiz tez orada siz bilan bog‘lanadi.`}>
        <div className="flex gap-3"><Link to="/buyurtmalarim" className="btn-primary">Buyurtmalarim</Link><Link to="/katalog" className="btn-ghost">Xaridni davom ettirish</Link></div>
      </Empty>
    </div>
  );
  if (!items.length) return <div className="mx-auto max-w-lg px-4 py-16"><Empty icon={ShoppingCart} title="Savat bo‘sh"><Link to="/katalog" className="btn-primary">Katalogga o‘tish</Link></Empty></div>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createOrder.mutate(
      { ...form, note: form.note || undefined, items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })) },
      {
        onSuccess: (order) => { dispatch(clearCart()); setDone(order); window.scrollTo(0, 0); },
        onError: (err) => dispatch(toast(err.message, 'err')),
      },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Buyurtmani rasmiylashtirish</h1>
      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="font-semibold">Mijoz</h2>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div><div className="text-slate-500">Ism</div><div className="font-medium">{user.name}</div></div>
              <div><div className="text-slate-500">Telefon</div><div className="font-medium">{user.phone}</div></div>
              <div><div className="text-slate-500">Kompaniya</div><div className="font-medium">{user.company || '—'}</div></div>
            </div>
          </div>
          <div className="card space-y-4 p-6">
            <h2 className="font-semibold">Yetkazib berish</h2>
            <div><label className="label" htmlFor="address">Manzil *</label><textarea id="address" required minLength={5} rows={2} className="input" placeholder="Shahar, tuman, ko‘cha, uy / do‘kon nomi" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label" htmlFor="note">Izoh</label><input id="note" className="input" placeholder="Masalan: ertalab 10:00 gacha" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <div className="card space-y-3 p-6">
            <h2 className="font-semibold">To‘lov usuli</h2>
            {(Object.entries(PAYMENT) as [PaymentMethod, string][]).map(([k, l]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl p-3.5 ring-1 transition ${form.payment_method === k ? 'bg-brand-50 ring-brand-400' : 'ring-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="pm" className="accent-brand-600" checked={form.payment_method === k} onChange={() => setForm({ ...form, payment_method: k })} />
                <span className="text-sm font-medium">{l}</span>
              </label>
            ))}
          </div>
        </div>
        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold">Buyurtma tarkibi</h2>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
            {items.map(({ product: p, qty }) => (
              <div key={p.id} className="flex justify-between gap-3 text-sm">
                <div><div className="font-medium">{p.name}</div><div className="text-slate-500">{qty} {p.unit} × {fmt(priceFor(p, qty))}</div></div>
                <div className="shrink-0 font-semibold">{fmt(priceFor(p, qty) * qty)}</div>
              </div>
            ))}
          </div>
          <hr className="my-4 border-slate-100" />
          {totals.saved > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Tejamkorlik</span><span>−{fmt(totals.saved)}</span></div>}
          <div className="mt-2 flex justify-between text-sm text-slate-500"><span>Yetkazib berish</span><span>Bepul</span></div>
          <div className="mt-3 flex justify-between text-xl font-bold"><span>Jami</span><span>{fmt(totals.total)}</span></div>
          <button disabled={createOrder.isPending} className="btn-primary mt-5 w-full py-3">{createOrder.isPending ? 'Yuborilmoqda…' : 'Buyurtmani tasdiqlash'}</button>
          <button type="button" onClick={() => nav(-1)} className="mt-2 w-full text-center text-sm text-slate-500 hover:text-slate-700">Ortga</button>
        </aside>
      </form>
    </div>
  );
}
