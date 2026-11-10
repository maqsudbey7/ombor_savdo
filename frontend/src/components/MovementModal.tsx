import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ClipboardCheck, HandCoins, Info, Search } from 'lucide-react';
import { useCreateMovement, useProducts } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { useT, type TKey } from '../i18n';
import { money, num } from '../lib/format';
import type { MovementType, Product } from '../types/api';
import { ErrorBox, Field, Modal, StockBadge } from './ui';
import { CustomerPicker, DuePicker } from './DebtFields';
import { isCustomerChosen, toCustomerRef, type CustomerChoice } from '../lib/debts';

const TYPES: { type: MovementType; icon: typeof ArrowDownToLine; hint: TKey; active: string }[] = [
  { type: 'in', icon: ArrowDownToLine, hint: 'mv.inHint', active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' },
  { type: 'out', icon: ArrowUpFromLine, hint: 'mv.outHint', active: 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' },
  { type: 'adjust', icon: ClipboardCheck, hint: 'mv.adjustHint', active: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' },
];

interface Props { wid: number; open: boolean; onClose: () => void; type?: MovementType; product?: Product }

export default function MovementModal({ wid, open, onClose, type = 'in', product }: Props) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('mm.title')} wide>
      {open && <MovementForm wid={wid} initialType={type} initialProduct={product} onDone={onClose} />}
    </Modal>
  );
}

function MovementForm({ wid, initialType, initialProduct, onDone }: { wid: number; initialType: MovementType; initialProduct?: Product; onDone: () => void }) {
  const t = useT();
  const [type, setType] = useState<MovementType>(initialType);
  const [product, setProduct] = useState<Product | undefined>(initialProduct);
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
  const [credit, setCredit] = useState(false);
  const [customer, setCustomer] = useState<CustomerChoice>({ name: '', phone: '' });
  const [due, setDue] = useState('');
  const products = useProducts(wid, { sort: 'name' });
  const create = useCreateMovement(wid);
  const dispatch = useAppDispatch();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data ?? []).filter((p) => !q || `${p.name} ${p.sku} ${p.location}`.toLowerCase().includes(q)).slice(0, 50);
  }, [products.data, search]);

  const n = Number(qty) || 0;
  const after = product ? (type === 'in' ? product.quantity + n : type === 'out' ? product.quantity - n : n) : 0;
  const defaultPrice = product ? (type === 'out' ? product.sale_price : product.cost_price) : 0;
  const unitPrice = price === '' ? defaultPrice : Number(price);
  const tooMuch = !!product && after < 0;
  const isCredit = type === 'out' && credit;
  const creditInvalid = isCredit && (!isCustomerChosen(customer) || n * unitPrice <= 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!product || creditInvalid) return;
    create.mutate(
      {
        product_id: product.id, type, quantity: n, price: price === '' ? undefined : Number(price), counterparty, note,
        ...(isCredit ? { debt: { ...toCustomerRef(customer), due_date: due || null } } : {}),
      },
      {
        onSuccess: (m) => {
          dispatch(toast(t('mm.saved', { type: t(`mv.${m.type}`), name: m.product_name, n: num(m.balance_after), unit: m.unit })));
          if (m.debt_id) dispatch(toast(t('mm.creditSaved', { name: customer.name })));
          onDone();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {TYPES.map((tp) => (
          <button key={tp.type} type="button" onClick={() => setType(tp.type)}
            className={`relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition ${type === tp.type ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}>
            {type === tp.type && <motion.span layoutId="mv-type" className={`absolute inset-0 rounded-xl ${tp.active}`} transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <tp.icon size={18} className="relative" />
            <span className="relative">{t(`mv.${tp.type}`)}</span>
            <span className={`relative hidden text-[11px] font-normal sm:block ${type === tp.type ? 'text-white/80' : 'text-slate-400'}`}>{t(tp.hint)}</span>
          </button>
        ))}
      </div>

      {!product ? (
        <div>
          <span className="label">{t('mm.pick')}</span>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus className="input pl-9" placeholder={t('mm.pickPh')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-2xl p-1 ring-1 ring-slate-100">
            {products.isPending && <div className="p-4 text-center text-sm text-slate-400">{t('common.loading')}</div>}
            {!products.isPending && !list.length && <div className="p-4 text-center text-sm text-slate-400">{t('mm.noProduct')}</div>}
            {list.map((p) => (
              <button key={p.id} type="button" onClick={() => setProduct(p)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-brand-50">
                <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="text-xs text-slate-400">{p.sku}{p.location && ` · ${p.location}`}</span></span>
                <span className="shrink-0 text-right"><span className="block font-semibold tabular-nums">{num(p.quantity)} {p.unit}</span><StockBadge p={p} /></span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="font-semibold">{product.name}</div><div className="text-xs text-slate-500">{product.sku}{product.location && ` · ${product.location}`}</div></div>
            {!initialProduct && <button type="button" className="text-sm font-semibold text-brand-600" onClick={() => setProduct(undefined)}>{t('common.change')}</button>}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"><div className="text-[11px] text-slate-400">{t('mm.now')}</div><div className="font-bold tabular-nums">{num(product.quantity)} {product.unit}</div></div>
            <ArrowRight size={18} className="text-slate-300" />
            <AnimatePresence mode="popLayout">
              <motion.div key={after} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className={`rounded-xl px-3 py-2 ring-1 ${tooMuch ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white ring-slate-200'}`}>
                <div className="text-[11px] text-slate-400">{t('mm.after')}</div><div className="font-bold tabular-nums">{num(after)} {product.unit}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          {tooMuch && <div className="mt-2 text-xs font-medium text-rose-600">{t('mm.tooMuch')}</div>}
        </motion.div>
      )}

      {type === 'adjust' && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-100">
          <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div><div className="font-semibold text-amber-900">{t('mm.adjustHelpT')}</div><p className="mt-0.5 text-amber-800/90">{t('mm.adjustHelp')}</p></div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={type === 'adjust' ? t('mm.count') : t('mm.qty')}
          hint={type === 'adjust' && product && qty !== '' ? t('mm.diff', { d: `${after - product.quantity > 0 ? '+' : ''}${num(after - product.quantity)} ${product.unit}` }) : undefined}>
          <input required type="number" min={type === 'adjust' ? 0 : 1} inputMode="numeric" className="input text-lg font-semibold" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </Field>
        {type !== 'adjust' && (
          <Field label={t('mm.price')} hint={product ? t('mm.priceHint', { v: money(defaultPrice) }) : undefined}>
            <input type="number" min={0} className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={product ? String(defaultPrice) : ''} />
          </Field>
        )}
        {type !== 'adjust' && !isCredit && (
          <Field label={type === 'in' ? t('mm.supplier') : t('mm.customer')}>
            <input className="input" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder={type === 'in' ? t('mm.supplierPh') : t('mm.customerPh')} />
          </Field>
        )}
        <Field label={t('common.note')}><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('mm.notePh')} /></Field>
      </div>

      {type === 'out' && (
        <div className={`rounded-2xl ring-1 transition ${isCredit ? 'bg-amber-50/50 ring-amber-200' : 'ring-slate-200'}`}>
          <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
            <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
            <HandCoins size={18} className="text-amber-600" />
            <span><span className="block text-sm font-semibold">{t('mm.credit')}</span><span className="text-xs text-slate-500">{t('mm.creditHint')}</span></span>
          </label>
          <AnimatePresence initial={false}>
            {isCredit && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid gap-4 border-t border-amber-200/70 px-4 py-4 sm:grid-cols-2">
                  <CustomerPicker wid={wid} value={customer} onChange={setCustomer} />
                  <DuePicker value={due} onChange={setDue} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {product && n > 0 && type !== 'adjust' && (
        <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">{t('mm.total')}</span><span className="font-bold">{money(n * unitPrice)}</span></div>
      )}
      {create.error && <ErrorBox error={create.error} />}
      <button disabled={!product || create.isPending || tooMuch || qty === '' || creditInvalid}
        className={`w-full py-3 ${type === 'in' ? 'btn-in' : type === 'out' ? 'btn-out' : 'btn bg-amber-500 text-white hover:bg-amber-600'}`}>
        {create.isPending ? t('common.saving') : t(`mm.save.${type}`)}
      </button>
    </form>
  );
}
