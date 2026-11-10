import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useDeleteWarehouse, useWarehouse } from '../../hooks/queries';
import { COLORS, fmtDate } from '../../lib/format';
import { ErrorBox, Spinner } from '../../components/ui';
import { useT } from '../../i18n';
import WarehouseModal from '../../components/WarehouseModal';
import { PasswordInput } from '../../components/feedback';
import PageHeader from './Header';
import { useWid } from './useWid';

export default function Settings() {
  const wid = useWid();
  const { data: wh, isPending, error } = useWarehouse(wid);
  const remove = useDeleteWarehouse();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState('');
  const t = useT();

  if (isPending) return <Spinner />;
  if (error || !wh) return <ErrorBox error={error ?? new Error(t('common.notFound'))} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('set.title')} />
      <div className="card overflow-hidden">
        <div className={`h-24 bg-gradient-to-r ${COLORS[wh.color].grad}`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{wh.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {wh.address || t('wh.noAddress')}</p>
              {wh.description && <p className="mt-3 max-w-xl text-sm text-slate-600">{wh.description}</p>}
              <p className="mt-3 text-xs text-slate-400">{t('set.created', { d: fmtDate(wh.created_at) })}</p>
            </div>
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} /> {t('common.edit')}</button>
          </div>
        </div>
      </div>

      <div className="card border border-rose-100 p-6">
        <h2 className="flex items-center gap-2 font-bold text-rose-600"><AlertTriangle size={18} /> {t('set.danger')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('set.dangerText')}</p>
        <form className="mt-4 max-w-sm space-y-3" onSubmit={(e) => { e.preventDefault(); remove.mutate({ id: wid, password: pw }, { onSuccess: () => nav('/omborlar') }); }}>
          <label className="block">
            <span className="label">{t('set.confirm')}</span>
            <PasswordInput className="" value={pw} onChange={setPw} autoComplete="current-password" placeholder={t('set.pwPh')} />
          </label>
          <button className="btn bg-rose-600 text-white hover:bg-rose-700" disabled={!pw || remove.isPending}>
            <Trash2 size={16} /> {remove.isPending ? t('common.wait') : t('set.delete')}
          </button>
        </form>
      </div>
      <WarehouseModal open={editing} onClose={() => setEditing(false)} warehouse={wh} />
    </div>
  );
}
