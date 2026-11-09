import { useCustomers } from '../../hooks/queries';
import { fmt, fmtDate } from '../../lib/format';
import { ErrorBox, Spinner } from '../../components/ui';

export default function Customers() {
  const { data, isPending, error } = useCustomers();
  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  return (
    <div>
      <h1 className="text-2xl font-bold">Mijozlar <span className="text-slate-400">({data.length})</span></h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-5 py-3">Mijoz</th><th className="px-5 py-3">Telefon</th><th className="px-5 py-3">Ro‘yxatdan o‘tgan</th><th className="px-5 py-3 text-right">Buyurtmalar</th><th className="px-5 py-3 text-right">Jami xarid</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-slate-500">{c.company}</div></td>
                <td className="px-5 py-3"><a href={`tel:${c.phone}`} className="text-brand-600">{c.phone}</a></td>
                <td className="px-5 py-3 text-slate-500">{fmtDate(c.created_at)}</td>
                <td className="px-5 py-3 text-right">{c.orders}</td>
                <td className="px-5 py-3 text-right font-semibold">{fmt(c.spent)}</td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Hali mijozlar yo‘q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
