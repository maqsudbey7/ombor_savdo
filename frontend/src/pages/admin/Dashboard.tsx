import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Package, Users, Wallet } from 'lucide-react';
import { useStats } from '../../hooks/queries';
import { fmt } from '../../lib/format';
import { ErrorBox, Spinner } from '../../components/ui';

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Dashboard() {
  const { data: s, isPending, error } = useStats();
  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = isoDay(new Date(Date.now() - (13 - i) * 864e5));
    return { day: d, total: s.daily.find((x) => x.day === d)?.total ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.total));
  const cards = [
    { icon: Wallet, label: 'Umumiy savdo', value: fmt(s.revenue), cls: 'bg-brand-50 text-brand-600' },
    { icon: ClipboardList, label: 'Buyurtmalar', value: `${s.orders} (${s.new_orders} yangi)`, cls: 'bg-amber-50 text-amber-600' },
    { icon: Users, label: 'Mijozlar', value: s.customers, cls: 'bg-emerald-50 text-emerald-600' },
    { icon: Package, label: 'Mahsulotlar', value: s.products, cls: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Boshqaruv paneli</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, cls }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${cls}`}><Icon size={22} /></div>
            <div><div className="text-sm text-slate-500">{label}</div><div className="text-xl font-bold">{value}</div></div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="card p-6">
          <h2 className="font-semibold">So‘nggi 14 kun savdosi</h2>
          <div className="mt-10 flex h-56 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="rounded-t-md bg-brand-500 transition group-hover:bg-brand-600" style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} />
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">{fmt(d.total)}</div>
                <div className="mt-1 text-center text-[10px] text-slate-400">{d.day.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-amber-500" /> Kam qolgan mahsulotlar</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {!s.low_stock.length && <p className="py-4 text-sm text-slate-500">Hammasi joyida 👍</p>}
            {s.low_stock.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate pr-2">{p.name}</span>
                <span className={`badge ${p.stock === 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/mahsulotlar" className="mt-3 block text-sm font-semibold text-brand-600">Omborni boshqarish →</Link>
        </div>
      </div>
    </div>
  );
}
