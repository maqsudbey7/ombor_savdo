import { useState, type FormEvent } from 'react';
import { useCategories, useSaveProduct } from '../hooks/queries';
import { money } from '../lib/format';
import { ChevronDown } from 'lucide-react';
import type { Product, ProductPayload } from '../types/api';
import { Drawer, ErrorBox, Field } from './ui';
import { useT, type TKey } from '../i18n';

const QUICK_UNITS = ['dona', 'kg', 'litr', 'metr', 'quti', 'qop', 'paket', 'blok'];

interface Props { wid: number; open: boolean; onClose: () => void; product?: Product }

export default function ProductDrawer({ wid, open, onClose, product }: Props) {
  const t = useT();
  return (
    <Drawer open={open} onClose={onClose} title={product ? t('pd.editTitle') : t('pd.newTitle')}>
      {open && <ProductForm wid={wid} product={product} onDone={onClose} />}
    </Drawer>
  );
}

interface FormState { name: string; sku: string; category_id: string; unit: string; cost_price: string; sale_price: string; min_quantity: string; location: string; description: string; initial_quantity: string }

const genSku = () => `SKU-${Date.now().toString(36).slice(-5).toUpperCase()}`;

function ProductForm({ wid, product, onDone }: { wid: number; product?: Product; onDone: () => void }) {
  const cats = useCategories(wid);
  const save = useSaveProduct(wid);
  const t = useT();
  const [f, setF] = useState<FormState>({
    name: product?.name ?? '', sku: product?.sku ?? genSku(), category_id: product?.category_id ? String(product.category_id) : '',
    unit: product?.unit ?? 'dona', cost_price: product ? String(product.cost_price) : '', sale_price: product ? String(product.sale_price) : '',
    min_quantity: String(product?.min_quantity ?? 0), location: product?.location ?? '', description: product?.description ?? '', initial_quantity: '0',
  });
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const margin = Number(f.sale_price) && Number(f.cost_price) ? Math.round(((Number(f.sale_price) - Number(f.cost_price)) / Number(f.cost_price)) * 100) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const data: ProductPayload = {
      name: f.name.trim(), sku: f.sku.trim(), category_id: f.category_id ? Number(f.category_id) : null, unit: f.unit.trim() || 'dona',
      cost_price: Number(f.cost_price) || 0, sale_price: Number(f.sale_price) || 0, min_quantity: Number(f.min_quantity) || 0,
      location: f.location.trim(), description: f.description,
      ...(product ? {} : { initial_quantity: Number(f.initial_quantity) || 0 }),
    };
    save.mutate({ id: product?.id, data }, { onSuccess: onDone });
  };

  const unitLabel = f.unit.trim() || 'dona';
  const customUnit = !QUICK_UNITS.includes(f.unit);
  const [more, setMore] = useState(!!product && !!(product.category_id || product.location || product.description));
  const [other, setOther] = useState(customUnit && f.unit !== '');
  const min = Number(f.min_quantity) || 0;
  const profit = Number(f.sale_price) - Number(f.cost_price);

  const step = (n: number, title: string) => (
    <div className="flex items-center gap-2.5 text-sm font-bold">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">{n}</span>{title}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        {step(1, t('pd.step1'))}
        <Field label={t('pd.name')}><input autoFocus required minLength={2} className="input py-3 text-base" value={f.name} onChange={set('name')} placeholder={t('pd.namePh')} /></Field>
        <div>
          <span className="label">{t('pd.unit')}</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_UNITS.map((u) => (
              <button key={u} type="button" onClick={() => { setOther(false); setF((s) => ({ ...s, unit: u })); }}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition ${!other && f.unit === u ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'}`}>
                {t(`unit.${u}` as TKey)}
              </button>
            ))}
            <button type="button" onClick={() => { setOther(true); setF((s) => ({ ...s, unit: '' })); }}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition ${other ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'}`}>
              {t('pd.unitOther')}
            </button>
          </div>
          {other && <input autoFocus required className="input mt-2" value={f.unit} onChange={set('unit')} placeholder={t('pd.unitPh')} maxLength={20} />}
        </div>
      </section>

      <section className="space-y-3">
        {step(2, t('pd.step2'))}
        <div className="grid grid-cols-2 gap-3">
          {!product && (
            <Field label={t('pd.initial')}>
              <div className="relative">
                <input type="number" min={0} inputMode="numeric" className="input py-3 pr-16 text-lg font-semibold" value={f.initial_quantity} onChange={set('initial_quantity')} onFocus={(e) => e.target.select()} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{unitLabel}</span>
              </div>
            </Field>
          )}
          <Field label={t('pd.min')}>
            <div className="relative">
              <input type="number" min={0} inputMode="numeric" className="input py-3 pr-16 text-lg font-semibold" value={f.min_quantity} onChange={set('min_quantity')} onFocus={(e) => e.target.select()} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{unitLabel}</span>
            </div>
          </Field>
        </div>
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
          {min > 0 ? t('pd.lowPreview', { m: min, u: unitLabel }) : t('pd.noLow')}
          {!product && <><br /><span className="text-amber-700/80">{t('pd.initialHint')}</span></>}
        </p>
        {product && <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">{t('pd.stockNote')}</p>}
      </section>

      <section className="space-y-3">
        {step(3, t('pd.step3'))}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('pd.cost', { u: unitLabel })}><input type="number" min={0} inputMode="numeric" className="input" value={f.cost_price} onChange={set('cost_price')} placeholder="0" /></Field>
          <Field label={t('pd.sale', { u: unitLabel })}><input type="number" min={0} inputMode="numeric" className="input" value={f.sale_price} onChange={set('sale_price')} placeholder="0" /></Field>
        </div>
        {Number(f.sale_price) > 0 && Number(f.cost_price) > 0 && (
          <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {t('pd.profit', { v: money(profit) })}{margin !== null && ` · ${t('pd.margin', { n: margin })}`}
          </p>
        )}
      </section>

      <div className="rounded-2xl ring-1 ring-slate-200">
        <button type="button" onClick={() => setMore(!more)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-600">
          {t('pd.more')} <ChevronDown size={18} className={`transition ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4">
            <Field label={t('pd.category')}>
              <select className="input" value={f.category_id} onChange={set('category_id')}>
                <option value="">{t('pd.noCategory')}</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('pd.location')}><input className="input" value={f.location} onChange={set('location')} placeholder={t('pd.locationPh')} /></Field>
            <div className="col-span-2"><Field label={t('pd.sku')}><input required className="input font-mono" value={f.sku} onChange={set('sku')} /></Field></div>
            <div className="col-span-2"><Field label={t('common.note')}><textarea rows={2} className="input" value={f.description} onChange={set('description')} placeholder={t('pd.notePh')} /></Field></div>
          </div>
        )}
      </div>

      {save.error && <ErrorBox error={save.error} />}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-slate-100 bg-white px-6 py-4">
        <button type="button" onClick={onDone} className="btn-ghost flex-1 py-3">{t('common.cancel')}</button>
        <button disabled={save.isPending || !f.unit.trim()} className="btn-primary flex-1 py-3">{save.isPending ? t('common.saving') : t('common.save')}</button>
      </div>
    </form>
  );
}
