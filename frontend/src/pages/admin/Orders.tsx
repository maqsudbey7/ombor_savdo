import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAdminOrders, useSetOrderStatus } from '../../hooks/queries';
import { useAppDispatch } from '../../store/hooks';
import { toast } from '../../store/uiSlice';
import { fmt, fmtDate, PAYMENT, STATUS } from '../../lib/format';
import type { OrderStatus } from '../../types/api';
import { ErrorBox, Spinner } from '../../components/ui';

const FILTERS: [OrderStatus | '', string][] = [['', 'Hammasi'], ...(Object.entries(STATUS) as [OrderStatus, { label: string }][]).map(([k, v]) => [k, v.label] as [OrderStatus, string])];

export default function AdminOrders() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [open, setOpen] = useState<number | null>(null);
  const orders = useAdminOrders(status || undefined);
  const setOrderStatus = useSetOrderStatus();
  const dispatch = useAppDispatch();

  const change = (id: number, s: OrderStatus) =>
    setOrderStatus.mutate({ id, status: s }, { onSuccess: () => dispatch(toast(`#${id}: ${STATUS[s].label}`)) });

  return (
    <div>
      <h1 className="text-2xl font-bold">Buyurtmalar</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`btn rounded-full px-4 py-1.5 ${status === k ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>
      {orders.isPending ? <Spinner /> : orders.isError ? <div className="mt-6"><ErrorBox error={orders.error} /></div> : (
        <div className="mt-6 space-y-3">
          {!orders.data.length && <div className="card p-10 text-center text-slate-500">Buyurtmalar yo‘q</div>}
          {orders.data.map((o) => (
            <div key={o.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 p-4">
                <button onClick={() => setOpen(open === o.id ? null : o.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open === o.id ? 'rotate-180' : ''}`} />
                  <div className="min-w-0">
                    <div className="font-semibold">#{o.id} · {o.user.name} {o.user.company && <span className="font-normal text-slate-500">({o.user.company})</span>}</div>
                    <div className="text-xs text-slate-500">{fmtDate(o.created_at)} · {o.items.length} pozitsiya · {PAYMENT[o.payment_method]}</div>
                  </div>
                </button>
                <div className="font-bold">{fmt(o.total)}</div>
                <select aria-label="Holat" value={o.status} disabled={setOrderStatus.isPending} onChange={(e) => change(o.id, e.target.value as OrderStatus)}
                  className={`rounded-full border-0 py-1 pl-3 pr-8 text-xs font-semibold focus:ring-2 focus:ring-brand-500 ${STATUS[o.status].cls}`}>
                  {(Object.keys(STATUS) as OrderStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
                </select>
              </div>
              {open === o.id && (
                <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 p-5 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <div><span className="text-slate-500">Telefon:</span> <a className="text-brand-600" href={`tel:${o.user.phone}`}>{o.user.phone}</a></div>
                    <div><span className="text-slate-500">Manzil:</span> {o.address}</div>
                    {o.note && <div><span className="text-slate-500">Izoh:</span> {o.note}</div>}
                  </div>
                  <div className="divide-y divide-slate-200">
                    {o.items.map((it) => <div key={it.id} className="flex justify-between gap-3 py-1.5"><span>{it.name} × {it.qty} {it.unit}</span><span className="shrink-0">{fmt(it.qty * it.unit_price)}</span></div>)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
