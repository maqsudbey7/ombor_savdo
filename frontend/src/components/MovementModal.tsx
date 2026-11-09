import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ClipboardCheck, Search } from 'lucide-react';
import { useCreateMovement, useProducts } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { MOVEMENT, money, num } from '../lib/format';
import type { MovementType, Product } from '../types/api';
import { ErrorBox, Field, Modal, StockBadge } from './ui';

const TYPES: { type: MovementType; icon: typeof ArrowDownToLine; hint: string; active: string }[] = [
  { type: 'in', icon: ArrowDownToLine, hint: 'Omborga tovar keldi', active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' },
  { type: 'out', icon: ArrowUpFromLine, hint: 'Ombordan tovar ketdi', active: 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' },
  { type: 'adjust', icon: ClipboardCheck, hint: 'Haqiqiy sanoqni kiritish', active: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' },
];

interface Props { wid: number; open: boolean; onClose: () => void; type?: MovementType; product?: Product }

export default function MovementModal({ wid, open, onClose, type = 'in', product }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Kirim / chiqim" wide>
      {open && <MovementForm wid={wid} initialType={type} initialProduct={product} onDone={onClose} />}
    </Modal>
  );
}

function MovementForm({ wid, initialType, initialProduct, onDone }: { wid: number; initialType: MovementType; initialProduct?: Product; onDone: () => void }) {
  const [type, setType] = useState<MovementType>(initialType);
  const [product, setProduct] = useState<Product | undefined>(initialProduct);
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
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
  const tooMuch = !!product && after < 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    create.mutate(
      { product_id: product.id, type, quantity: n, price: price === '' ? undefined : Number(price), counterparty, note },
      { onSuccess: (m) => { dispatch(toast(`${MOVEMENT[m.type].label}: ${m.product_name} — qoldiq ${num(m.balance_after)} ${m.unit}`)); onDone(); } },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {TYPES.map((t) => (
          <button key={t.type} type="button" onClick={() => setType(t.type)}
            className={`relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition ${type === t.type ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}>
            {type === t.type && <motion.span layoutId="mv-type" className={`absolute inset-0 rounded-xl ${t.active}`} transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <t.icon size={18} className="relative" />
            <span className="relative">{MOVEMENT[t.type].label}</span>
            <span className={`relative hidden text-[11px] font-normal sm:block ${type === t.type ? 'text-white/80' : 'text-slate-400'}`}>{t.hint}</span>
          </button>
        ))}
      </div>

      {!product ? (
        <div>
          <span className="label">Mahsulotni tanlang *</span>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus className="input pl-9" placeholder="Nomi, SKU yoki joylashuv…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-2xl p-1 ring-1 ring-slate-100">
            {products.isPending && <div className="p-4 text-center text-sm text-slate-400">Yuklanmoqda…</div>}
            {!products.isPending && !list.length && <div className="p-4 text-center text-sm text-slate-400">Mahsulot topilmadi</div>}
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
            {!initialProduct && <button type="button" className="text-sm font-semibold text-brand-600" onClick={() => setProduct(undefined)}>O‘zgartirish</button>}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"><div className="text-[11px] text-slate-400">Hozir</div><div className="font-bold tabular-nums">{num(product.quantity)} {product.unit}</div></div>
            <ArrowRight size={18} className="text-slate-300" />
            <AnimatePresence mode="popLayout">
              <motion.div key={after} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className={`rounded-xl px-3 py-2 ring-1 ${tooMuch ? 'bg-rose-50 ring-rose-200 text-rose-700' : 'bg-white ring-slate-200'}`}>
                <div className="text-[11px] text-slate-400">Keyin</div><div className="font-bold tabular-nums">{num(after)} {product.unit}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          {tooMuch && <div className="mt-2 text-xs font-medium text-rose-600">Omborda buncha mahsulot yo‘q</div>}
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={type === 'adjust' ? 'Haqiqiy sanoq *' : 'Miqdor *'}>
          <input required type="number" min={type === 'adjust' ? 0 : 1} inputMode="numeric" className="input text-lg font-semibold" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Narx (1 birlik uchun)" hint={product ? `Bo‘sh qolsa: ${money(defaultPrice)}` : undefined}>
          <input type="number" min={0} className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={product ? String(defaultPrice) : ''} />
        </Field>
        {type !== 'adjust' && (
          <Field label={type === 'in' ? 'Yetkazib beruvchi' : 'Mijoz / qabul qiluvchi'}>
            <input className="input" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder={type === 'in' ? 'Masalan: Agro Trade MChJ' : 'Masalan: Baraka do‘koni'} />
          </Field>
        )}
        <Field label="Izoh"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hujjat raqami, sabab…" /></Field>
      </div>

      {product && n > 0 && type !== 'adjust' && (
        <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Jami summa</span><span className="font-bold">{money(n * (price === '' ? defaultPrice : Number(price)))}</span></div>
      )}
      {create.error && <ErrorBox error={create.error} />}
      <button disabled={!product || create.isPending || tooMuch || qty === ''}
        className={`w-full py-3 ${type === 'in' ? 'btn-in' : type === 'out' ? 'btn-out' : 'btn bg-amber-500 text-white hover:bg-amber-600'}`}>
        {create.isPending ? 'Saqlanmoqda…' : `${MOVEMENT[type].label}ni saqlash`}
      </button>
    </form>
  );
}
