import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import type { Warehouse, WarehousePayload } from '../types/api';
import { ColorPicker, ErrorBox, Field, Modal } from './ui';
import { useT } from '../i18n';

interface Props { open: boolean; onClose: () => void; warehouse?: Warehouse }

export default function WarehouseModal({ open, onClose, warehouse }: Props) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={warehouse ? t('whm.editTitle') : t('whm.newTitle')}>
      {open && <WarehouseForm warehouse={warehouse} onDone={onClose} />}
    </Modal>
  );
}

function WarehouseForm({ warehouse, onDone }: { warehouse?: Warehouse; onDone: () => void }) {
  const [f, setF] = useState<WarehousePayload>({
    name: warehouse?.name ?? '', address: warehouse?.address ?? '', description: warehouse?.description ?? '',
    color: warehouse?.color ?? 'blue', with_sample: false,
  });
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse(warehouse?.id ?? 0);
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const t = useT();
  const busy = create.isPending || update.isPending;
  const error = create.error || update.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (warehouse) {
      update.mutate({ ...f, with_sample: undefined }, { onSuccess: onDone });
    } else {
      create.mutate(f, {
        onSuccess: (w) => { dispatch(toast(t('whm.created', { name: w.name }))); onDone(); nav(`/omborlar/${w.id}`); },
      });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('whm.name')}><input autoFocus required minLength={2} className="input" placeholder={t('whm.namePh')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t('whm.address')}><input className="input" placeholder={t('whm.addressPh')} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label={t('whm.desc')}><textarea rows={2} className="input" placeholder={t('whm.descPh')} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div><span className="label">{t('common.color')}</span><ColorPicker value={f.color} onChange={(color) => setF({ ...f, color })} /></div>
      {!warehouse && (
        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition ${f.with_sample ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50'}`}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.with_sample} onChange={(e) => setF({ ...f, with_sample: e.target.checked })} />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={15} className="text-brand-600" /> {t('whm.sample')}</span>
            <span className="text-xs text-slate-500">{t('whm.sampleText')}</span>
          </span>
        </label>
      )}
      {error && <ErrorBox error={error} />}
      <button disabled={busy} className="btn-primary w-full py-3">{busy ? t('common.saving') : warehouse ? t('common.save') : t('whm.create')}</button>
    </form>
  );
}
