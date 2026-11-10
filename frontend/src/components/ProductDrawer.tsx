import { useState, type FormEvent } from 'react';
import { useCategories, useSaveProduct } from '../hooks/queries';
import { UNITS } from '../lib/format';
import type { Product, ProductPayload } from '../types/api';
import { Drawer, ErrorBox, Field } from './ui';
import { useT } from '../i18n';

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

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('pd.name')}><input autoFocus required minLength={2} className="input" value={f.name} onChange={set('name')} placeholder={t('pd.namePh')} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('pd.sku')}><input required className="input font-mono" value={f.sku} onChange={set('sku')} /></Field>
        <Field label={t('pd.category')}>
          <select className="input" value={f.category_id} onChange={set('category_id')}>
            <option value="">{t('pd.noCategory')}</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t('pd.unit')}>
          <input className="input" list="units" value={f.unit} onChange={set('unit')} />
          <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        <Field label={t('pd.location')}><input className="input" value={f.location} onChange={set('location')} placeholder="A-3" /></Field>
        <Field label={t('pd.cost')}><input type="number" min={0} className="input" value={f.cost_price} onChange={set('cost_price')} placeholder="0" /></Field>
        <Field label={t('pd.sale')} hint={margin !== null ? t('pd.margin', { n: margin }) : undefined}><input type="number" min={0} className="input" value={f.sale_price} onChange={set('sale_price')} placeholder="0" /></Field>
        <Field label={t('pd.min')} hint={t('pd.minHint')}><input type="number" min={0} className="input" value={f.min_quantity} onChange={set('min_quantity')} /></Field>
        {!product && <Field label={t('pd.initial')} hint={t('pd.initialHint')}><input type="number" min={0} className="input" value={f.initial_quantity} onChange={set('initial_quantity')} /></Field>}
      </div>
      <Field label={t('common.note')}><textarea rows={3} className="input" value={f.description} onChange={set('description')} /></Field>
      {product && <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">{t('pd.stockNote')}</p>}
      {save.error && <ErrorBox error={save.error} />}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone} className="btn-ghost flex-1">{t('common.cancel')}</button>
        <button disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? t('common.saving') : t('common.save')}</button>
      </div>
    </form>
  );
}
