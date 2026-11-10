import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, Check, Copy, HandCoins, MessageCircle, MessageSquare, Pencil, Phone, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { useCustomers, useDebts, useDeleteCustomer, usePayDebt, useRemind, useSaveCustomer, useSaveDebt } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { LANGS, useT, type Lang } from '../i18n';
import { fmtDate, fmtDay, isoDay, money, moneyShort, timeAgo } from '../lib/format';
import type { Debt } from '../types/api';
import { Drawer, ErrorBox, Field, Modal, Skeleton } from './ui';
import { CustomerPicker, DuePicker } from './DebtFields';
import { buildReminder, isCustomerChosen, toCustomerRef, type CustomerChoice } from '../lib/debts';
import { useDebtActions } from './useDebtActions';
import { confirmAsk } from './feedback';

// ---------- Holat belgisi ----------
const STATUS_CLS: Record<Debt['status'], string> = {
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  due_today: 'bg-amber-50 text-amber-700 ring-amber-200',
  due_soon: 'bg-sky-50 text-sky-700 ring-sky-200',
  open: 'bg-slate-100 text-slate-600 ring-slate-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function DebtStatusBadge({ d }: { d: Pick<Debt, 'status' | 'days_left'> }) {
  const t = useT();
  const text = d.status === 'paid' ? t('debt.st.paid')
    : d.days_left === null ? t('debt.st.noDue')
      : d.status === 'overdue' ? t('debt.st.overdue', { n: -d.days_left })
        : d.status === 'due_today' ? t('debt.st.today')
          : t('debt.st.left', { n: d.days_left });
  return (
    <span className={`badge shrink-0 whitespace-nowrap ring-1 ${STATUS_CLS[d.status]}`}>
      {d.status === 'overdue' && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-pulsering rounded-full bg-rose-500" /><span className="relative h-1.5 w-1.5 rounded-full bg-rose-500" /></span>}
      {text}
    </span>
  );
}

export function PaidBar({ d }: { d: Pick<Debt, 'amount' | 'paid_amount' | 'status'> }) {
  const pct = Math.min(100, (d.paid_amount / d.amount) * 100);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <motion.div className={`h-full rounded-full ${d.status === 'paid' ? 'bg-emerald-500' : d.status === 'overdue' ? 'bg-rose-400' : 'bg-brand-500'}`}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
    </div>
  );
}

// ---------- Qarz yozish / tahrirlash ----------
interface DebtModalProps { wid: number; open: boolean; onClose: () => void; debt?: Debt; customer?: CustomerChoice }

export function DebtModal({ wid, open, onClose, debt, customer }: DebtModalProps) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={debt ? t('dm.editTitle') : t('dm.newTitle')} wide>
      {open && <DebtForm wid={wid} debt={debt} customer={customer} onDone={onClose} />}
    </Modal>
  );
}

function DebtForm({ wid, debt, customer: preset, onDone }: { wid: number; debt?: Debt; customer?: CustomerChoice; onDone: () => void }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const save = useSaveDebt(wid);
  const [customer, setCustomer] = useState<CustomerChoice>(preset ?? (debt ? { id: debt.customer.id, name: debt.customer.name, phone: debt.customer.phone } : { name: '', phone: '' }));
  const [description, setDescription] = useState(debt?.description ?? '');
  const [amount, setAmount] = useState(debt ? String(debt.amount) : '');
  const [given, setGiven] = useState(debt?.given_date ?? isoDay());
  const [due, setDue] = useState(debt?.due_date ?? isoDay(14));
  const [note, setNote] = useState(debt?.note ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const data = { description: description.trim(), amount: Number(amount), given_date: given, due_date: due || null, note };
    save.mutate(
      { id: debt?.id, data: debt ? data : { ...data, ...toCustomerRef(customer) } },
      { onSuccess: () => { dispatch(toast(t(debt ? 'dm.updated' : 'dm.saved'))); onDone(); } },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {debt ? (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold">{debt.customer.name}</span> <span className="text-slate-500">{debt.customer.phone}</span></div>
      ) : (
        <CustomerPicker wid={wid} value={customer} onChange={setCustomer} />
      )}
      <Field label={t('dm.what')}><input required className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('dm.whatPh')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('dm.amount')} hint={Number(amount) > 0 ? money(Number(amount)) : undefined}>
          <input required type="number" min={1} inputMode="numeric" className="input text-lg font-semibold" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label={t('dm.givenDate')}><input type="date" required className="input" value={given} max={isoDay()} onChange={(e) => setGiven(e.target.value)} /></Field>
      </div>
      <DuePicker value={due} onChange={setDue} min={given} />
      <Field label={t('common.note')}><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {save.error && <ErrorBox error={save.error} />}
      <button disabled={save.isPending || (!debt && !isCustomerChosen(customer))} className="btn-primary w-full py-3">
        {save.isPending ? t('common.saving') : t('dm.save')}
      </button>
    </form>
  );
}

// ---------- To'lov ----------
export function PaymentModal({ wid, debt, onClose }: { wid: number; debt: Debt | null; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={!!debt} onClose={onClose} title={t('pm.title')}>
      {debt && <PaymentForm wid={wid} debt={debt} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ wid, debt, onDone }: { wid: number; debt: Debt; onDone: () => void }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const pay = usePayDebt(wid);
  const [amount, setAmount] = useState(String(debt.remaining));
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const after = debt.remaining - n;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    pay.mutate({ id: debt.id, amount: n, note }, {
      onSuccess: (d) => { dispatch(toast(t(d.remaining === 0 ? 'pm.fullyPaid' : 'pm.saved'))); onDone(); },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="font-semibold">{debt.customer.name}</div>
        <div className="text-sm text-slate-500">{debt.description}</div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-slate-500">{t('pm.rest')}</span>
          <span className="text-2xl font-extrabold tabular-nums">{money(debt.remaining)}</span>
        </div>
      </div>
      <Field label={t('pm.amount')}>
        <input autoFocus required type="number" min={1} max={debt.remaining} inputMode="numeric" className="input text-lg font-semibold" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <button type="button" className="btn-soft flex-1 py-2" onClick={() => setAmount(String(debt.remaining))}>{t('pm.full')}</button>
        <button type="button" className="btn-soft flex-1 py-2" onClick={() => setAmount(String(Math.round(debt.remaining / 2)))}>{t('pm.half')}</button>
      </div>
      <Field label={t('common.note')}><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('pm.notePh')} /></Field>
      {n > 0 && n <= debt.remaining && (
        <div className="flex justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{t('pm.after')}</span><b className="tabular-nums">{money(after)}</b>
        </div>
      )}
      {pay.error && <ErrorBox error={pay.error} />}
      <button disabled={pay.isPending || n <= 0 || n > debt.remaining} className="btn-in w-full py-3">
        <HandCoins size={18} /> {pay.isPending ? t('common.saving') : t('pm.save')}
      </button>
    </form>
  );
}

// ---------- Eslatma yuborish ----------
export function RemindModal({ wid, debt, shop, onClose }: { wid: number; debt: Debt | null; shop: string; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={!!debt} onClose={onClose} title={t('rm.title')}>
      {debt && <RemindBody wid={wid} debt={debt} shop={shop} />}
    </Modal>
  );
}

function RemindBody({ wid, debt, shop }: { wid: number; debt: Debt; shop: string }) {
  const t = useT();
  const uiLang = useAppSelector((s) => s.ui.lang);
  const dispatch = useAppDispatch();
  const remind = useRemind(wid);
  const [lang, setLang] = useState<Lang>(uiLang);
  const [text, setText] = useState(() => buildReminder(uiLang, debt, shop));
  useEffect(() => { setText(buildReminder(lang, debt, shop)); }, [lang, debt, shop]);

  const phone = debt.customer.phone.replace(/[^\d+]/g, '');
  const enc = encodeURIComponent(text);
  const mark = () => remind.mutate(debt.id);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); dispatch(toast(t('rm.copied'))); mark(); } catch { /* clipboard yo'q */ }
  };

  const links = phone ? [
    { label: 'SMS', icon: MessageSquare, href: `sms:${phone}?body=${enc}`, cls: 'bg-slate-900 text-white hover:bg-slate-800' },
    { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/${phone.replace('+', '')}?text=${enc}`, cls: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { label: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${enc}`, cls: 'bg-sky-500 text-white hover:bg-sky-600' },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{t('rm.lang')}</span>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)}
              className={`rounded-md px-3 py-1.5 transition ${lang === l.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l.label}</button>
          ))}
        </div>
      </div>
      <textarea rows={5} className="input leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="text-xs text-slate-500">{phone ? t('rm.hint') : t('rm.noPhone')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" onClick={mark} className={`btn py-3 ${l.cls}`}>
            <l.icon size={18} /> {l.label}
          </a>
        ))}
        <button type="button" onClick={copy} className={`btn-ghost py-3 ${phone ? '' : 'col-span-2 sm:col-span-4'}`}><Copy size={18} /> {t('rm.copy')}</button>
      </div>
      {debt.reminded_at && <p className="text-center text-xs text-slate-400">{t('debt.reminded', { t: timeAgo(debt.reminded_at) })}</p>}
    </div>
  );
}

// ---------- Bitta qarz kartochkasi ----------
interface DebtCardProps { d: Debt; onPay: (d: Debt) => void; onRemind: (d: Debt) => void; onEdit?: (d: Debt) => void; onDelete?: (d: Debt) => void; onUndo?: (d: Debt, paymentId: number) => void; showCustomer?: boolean; onOpenCustomer?: (id: number) => void }

export function DebtCard({ d, onPay, onRemind, onEdit, onDelete, onUndo, showCustomer = true, onOpenCustomer }: DebtCardProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const paid = d.status === 'paid';
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden ${d.status === 'overdue' ? 'ring-rose-200' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showCustomer && (
              <button type="button" onClick={() => onOpenCustomer?.(d.customer.id)} className="block max-w-full truncate text-left font-semibold hover:text-brand-600">{d.customer.name}</button>
            )}
            <div className={`truncate text-sm ${showCustomer ? 'text-slate-500' : 'font-semibold'}`}>{d.description}</div>
          </div>
          <DebtStatusBadge d={d} />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-xs text-slate-400">
            <div>{t('debt.given', { d: fmtDay(d.given_date) })}{d.movement_id && ` · ${t('debt.fromMovement')}`}</div>
            <div>{d.due_date ? t('debt.due', { d: fmtDay(d.due_date) }) : t('debt.st.noDue')}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{paid ? t('debt.st.paid') : t('debt.rest')}</div>
            <div className={`text-xl font-extrabold tabular-nums ${paid ? 'text-emerald-600' : d.status === 'overdue' ? 'text-rose-600' : ''}`}>{money(paid ? d.amount : d.remaining)}</div>
          </div>
        </div>
        <div className="mt-3"><PaidBar d={d} /></div>
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
          <button type="button" className="hover:text-slate-700" onClick={() => setOpen(!open)} disabled={!d.payments.length}>
            {t('debt.paid', { v: moneyShort(d.paid_amount) })}{d.payments.length > 0 && ` (${d.payments.length}) ${open ? '▴' : '▾'}`}
          </button>
          <span>/ {moneyShort(d.amount)}</span>
        </div>
        <AnimatePresence initial={false}>
          {open && d.payments.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-2">
                {d.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
                    <span className="text-slate-500">{fmtDate(p.paid_at)}{p.note && ` · ${p.note}`}</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      +{money(p.amount)}
                      {onUndo && <button type="button" className="icon-btn h-6 w-6" title={t('cd.undoPay')} aria-label={t('cd.undoPay')} onClick={() => onUndo(d, p.id)}><Undo2 size={13} /></button>}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!paid && (
        <div className="flex border-t border-slate-100">
          <button type="button" onClick={() => onPay(d)} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
            <HandCoins size={16} /> {t('debt.pay')}
          </button>
          <button type="button" onClick={() => onRemind(d)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-slate-100 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            <BellRing size={16} /> {t('debt.remind')}
            {d.reminded_at && <Check size={14} className="text-emerald-500" />}
          </button>
          {d.customer.phone && (
            <a href={`tel:${d.customer.phone}`} className="grid w-12 place-items-center border-l border-slate-100 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" title={t('debt.call')} aria-label={t('debt.call')}>
              <Phone size={16} />
            </a>
          )}
          {onEdit && <button type="button" onClick={() => onEdit(d)} className="grid w-12 place-items-center border-l border-slate-100 text-slate-500 transition hover:bg-slate-50" aria-label={t('common.edit')}><Pencil size={15} /></button>}
          {onDelete && <button type="button" onClick={() => onDelete(d)} className="grid w-12 place-items-center border-l border-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={t('common.delete')}><Trash2 size={15} /></button>}
        </div>
      )}
      {paid && onDelete && (
        <div className="flex justify-end border-t border-slate-100 px-2 py-1">
          <button type="button" onClick={() => onDelete(d)} className="icon-btn h-8 w-8 hover:bg-rose-50 hover:text-rose-600" aria-label={t('common.delete')}><Trash2 size={15} /></button>
        </div>
      )}
    </motion.div>
  );
}

// ---------- Mijoz kartochkasi ----------
export function CustomerDrawer({ wid, customerId, shop, onClose }: { wid: number; customerId: number | null; shop: string; onClose: () => void }) {
  const t = useT();
  const customers = useCustomers(wid);
  const c = customers.data?.find((x) => x.id === customerId);
  return (
    <Drawer open={customerId !== null} onClose={onClose} title={c?.name ?? t('cd.title')}>
      {customerId !== null && (c ? <CustomerBody wid={wid} customerId={customerId} shop={shop} onClose={onClose} /> : <Skeleton className="h-40" />)}
    </Drawer>
  );
}

function CustomerBody({ wid, customerId, shop, onClose }: { wid: number; customerId: number; shop: string; onClose: () => void }) {
  const t = useT();
  const { data: customers } = useCustomers(wid);
  const c = customers!.find((x) => x.id === customerId)!;
  const debts = useDebts(wid, { filter: 'all', customer_id: customerId });
  const actions = useDebtActions(wid);
  const saveCustomer = useSaveCustomer(wid);
  const delCustomer = useDeleteCustomer(wid);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: c.name, phone: c.phone, note: c.note });
  const [newDebt, setNewDebt] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveCustomer.mutate({ id: c.id, data: form }, { onSuccess: () => setEdit(false) });
  };
  const sorted = [...(debts.data ?? [])].sort((a, b) => Number(a.status === 'paid') - Number(b.status === 'paid'));

  return (
    <div className="space-y-5">
      {edit ? (
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <Field label={t('cd.name')}><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t('common.phone')}><input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" /></Field>
          <Field label={t('common.note')}><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          {saveCustomer.error && <ErrorBox error={saveCustomer.error} />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setEdit(false)}>{t('common.cancel')}</button>
            <button className="btn-primary flex-1" disabled={saveCustomer.isPending}>{t('common.save')}</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {c.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 font-semibold text-brand-600"><Phone size={15} /> {c.phone}</a> : <span className="text-slate-400">—</span>}
            {c.note && <p className="mt-1 text-sm text-slate-500">{c.note}</p>}
          </div>
          <div className="flex gap-1">
            <button className="icon-btn" title={t('cd.edit')} aria-label={t('cd.edit')} onClick={() => setEdit(true)}><Pencil size={17} /></button>
            <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" title={t('cd.delete')} aria-label={t('cd.delete')}
              onClick={async () => { if (await confirmAsk({ text: t('cd.confirmDelete', { name: c.name }) })) delCustomer.mutate(c.id, { onSuccess: onClose }); }}><Trash2 size={17} /></button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{t('cd.taken')}</div><div className="font-bold tabular-nums">{moneyShort(c.total)}</div></div>
        <div className="rounded-2xl bg-emerald-50 p-3"><div className="text-[11px] text-emerald-700">{t('cd.returned')}</div><div className="font-bold tabular-nums text-emerald-700">{moneyShort(c.paid)}</div></div>
        <div className={`rounded-2xl p-3 ${c.remaining ? 'bg-rose-50' : 'bg-slate-50'}`}><div className={`text-[11px] ${c.remaining ? 'text-rose-700' : 'text-slate-500'}`}>{t('cd.rest')}</div><div className={`font-bold tabular-nums ${c.remaining ? 'text-rose-700' : ''}`}>{moneyShort(c.remaining)}</div></div>
      </div>

      <button className="btn-primary w-full" onClick={() => setNewDebt(true)}><Plus size={18} /> {t('cd.newDebt')}</button>

      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-500">{t('cd.history')}</h3>
        {debts.isPending ? <Skeleton className="h-32" /> : (
          <div className="space-y-3">
            {sorted.map((d) => <DebtCard key={d.id} d={d} showCustomer={false} {...actions.handlers} />)}
          </div>
        )}
      </div>
      {actions.dialogs(shop)}
      <DebtModal wid={wid} open={newDebt} onClose={() => setNewDebt(false)} customer={{ id: c.id, name: c.name, phone: c.phone }} />
    </div>
  );
}
