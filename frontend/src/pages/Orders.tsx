import { Link, Navigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useMyOrders } from '../hooks/queries';
import { useAppSelector } from '../store/hooks';
import { fmt, fmtDate, PAYMENT, STATUS } from '../lib/format';
import type { OrderStatus } from '../types/api';
import { Empty, ErrorBox, Spinner } from '../components/ui';

const STEPS: OrderStatus[] = ['new', 'confirmed', 'shipping', 'delivered'];

export default function Orders() {
  const user = useAppSelector((s) => s.auth.user);
  const orders = useMyOrders(!!user);
  if (!user) return <Navigate to="/kirish?next=/buyurtmalarim" replace />;
  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorBox error={orders.error} /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Buyurtmalarim</h1>
      <div className="mt-6 space-y-4">
        {!orders.data.length && <Empty icon={Package} title="Hali buyurtma yo‘q" text="Katalogdan mahsulot tanlab, birinchi buyurtmangizni bering."><Link to="/katalog" className="btn-primary">Katalog</Link></Empty>}
        {orders.data.map((o) => {
          const step = STEPS.indexOf(o.status);
          return (
            <div key={o.id} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><div className="font-bold">Buyurtma #{o.id}</div><div className="text-sm text-slate-500">{fmtDate(o.created_at)} · {PAYMENT[o.payment_method]}</div></div>
                <span className={`badge ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
              </div>
              {o.status !== 'cancelled' && (
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {STEPS.map((s, i) => (
                    <div key={s}>
                      <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-slate-200'}`} />
                      <div className={`mt-1.5 text-[11px] ${i <= step ? 'font-semibold text-brand-700' : 'text-slate-400'}`}>{STATUS[s].label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 divide-y divide-slate-100 text-sm">
                {o.items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-3 py-2"><span>{it.name} <span className="text-slate-400">× {it.qty} {it.unit}</span></span><span className="shrink-0 font-medium">{fmt(it.qty * it.unit_price)}</span></div>
                ))}
              </div>
              <div className="mt-3 flex justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-sm text-slate-500">📍 {o.address}</span><span className="shrink-0 text-lg font-bold">{fmt(o.total)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
