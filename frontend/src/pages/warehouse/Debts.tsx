import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, CalendarClock, ChevronRight, HandCoins, Plus, Search, TrendingUp, Users, Wallet } from 'lucide-react';
import { useCustomers, useDebtSummary, useDebts, useWarehouse } from '../../hooks/queries';
import { useT, type TKey } from '../../i18n';
import { fmtDay, money, moneyShort } from '../../lib/format';
import type { DebtFilter } from '../../types/api';
import { CountUp, Empty, ErrorBox, Skeleton } from '../../components/ui';
import { stagger } from '../../lib/motion';
import { CustomerDrawer, DebtCard, DebtModal } from '../../components/DebtDialogs';
import { useDebtActions } from '../../components/useDebtActions';
import PageHeader from './Header';
import { useWid } from './useWid';

const FILTERS: [DebtFilter, TKey][] = [['open', 'debt.f.open'], ['overdue', 'debt.f.overdue'], ['soon', 'debt.f.soon'], ['paid', 'debt.f.paid'], ['all', 'common.all']];

function HowItWorks() {
  const t = useT();
  const steps: TKey[] = ['debt.how1', 'debt.how2', 'debt.how3', 'debt.how4'];
  return (
    <div className="card p-5">
      <div className="font-bold">{t('debt.howTitle')}</div>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm text-slate-600">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>{t(s)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Debts() {
  const wid = useWid();
  const t = useT();
  const [sp, setSp] = useSearchParams();
  const filter = (sp.get('f') as DebtFilter) || 'open';
  const view = sp.get('view') === 'customers' ? 'customers' : 'debts';
  const q = sp.get('q') ?? '';
  const customerId = Number(sp.get('customer')) || null;
  // Bir nechta URL parametrini bir martada o'zgartirish (ketma-ket chaqirilsa biri ikkinchisini o'chirib yuboradi)
  const set = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    setSp(n, { replace: true });
  };

  const { data: wh } = useWarehouse(wid);
  const summary = useDebtSummary(wid);
  const debts = useDebts(wid, { filter, q: q || undefined });
  const customers = useCustomers(wid, view === 'customers' ? q : undefined);
  const actions = useDebtActions(wid);
  const [creating, setCreating] = useState(false);
  const shop = wh?.name ?? '';
  const s = summary.data;
  const noDebtsAtAll = s && s.outstanding === 0 && !customers.data?.length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('debt.title')} actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> {t('debt.new')}</button>} />

      {summary.isPending ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : s && (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[
            { icon: Wallet, label: t('debt.outstanding'), value: s.outstanding, sub: t('debt.outstandingSub', { n: s.debtors_count }), cls: 'from-brand-500 to-indigo-600', f: 'open' },
            { icon: AlertTriangle, label: t('debt.overdue'), value: s.overdue_amount, sub: t('debt.overdueSub', { n: s.overdue_count }), cls: 'from-rose-500 to-pink-600', f: 'overdue' },
            { icon: CalendarClock, label: t('debt.soon'), value: s.due_today_count + s.due_soon_count, sub: t('debt.soonSub', { a: s.due_today_count, b: s.due_soon_count }), cls: 'from-amber-400 to-orange-500', f: 'soon', count: true },
            { icon: TrendingUp, label: t('debt.collected'), value: s.collected_30d, sub: '', cls: 'from-emerald-500 to-teal-600', f: 'paid' },
          ].map((c) => (
            <motion.button key={c.label} type="button" variants={stagger.item} whileHover={{ y: -3 }} onClick={() => set({ f: c.f === 'open' ? '' : c.f, view: '' })}
              className={`card relative flex flex-col items-start overflow-hidden p-4 text-left transition sm:p-5 ${filter === c.f && view === 'debts' ? 'ring-2 ring-brand-400' : ''}`}>
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.cls} text-white shadow-lg`}><c.icon size={19} /></div>
              <div className="mt-3 text-xs text-slate-500 sm:text-sm">{c.label}</div>
              <div className="text-lg font-extrabold tracking-tight sm:text-2xl">
                <CountUp value={c.value} format={c.count ? (n) => String(Math.round(n)) : (n) => `${moneyShort(n)} ${t('common.currency')}`} />
              </div>
              {c.sub && <div className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">{c.sub}</div>}
            </motion.button>
          ))}
        </motion.div>
      )}

      {noDebtsAtAll ? (
        <>
          <Empty icon={HandCoins} title={t('debt.emptyTitle')} text={t('debt.emptyText')}>
            <button className="btn-primary px-6 py-3" onClick={() => setCreating(true)}><Plus size={18} /> {t('debt.new')}</button>
          </Empty>
          <HowItWorks />
        </>
      ) : (
        <>
          <div className="card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['debts', 'customers'] as const).map((v) => (
                <button key={v} onClick={() => set({ view: v === 'debts' ? '' : v })}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${view === v ? 'text-slate-900' : 'text-slate-500'}`}>
                  {view === v && <motion.span layoutId="debt-view" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  {v === 'customers' ? <Users size={15} className="relative" /> : <HandCoins size={15} className="relative" />}
                  <span className="relative">{t(v === 'debts' ? 'debt.byDebt' : 'debt.byCustomer')}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" placeholder={t('debt.searchPh')} value={q} onChange={(e) => set({ q: e.target.value })} />
            </div>
          </div>

          {view === 'debts' ? (
            <>
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {FILTERS.map(([k, l]) => (
                  <button key={k} onClick={() => set({ f: k === 'open' ? '' : k })}
                    className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === k ? 'text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                    {filter === k && <motion.span layoutId="debt-filter" className={`absolute inset-0 rounded-full ${k === 'overdue' ? 'bg-rose-600' : k === 'paid' ? 'bg-emerald-600' : 'bg-ink-900'}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="relative">{t(l)}</span>
                  </button>
                ))}
              </div>
              {debts.error && <ErrorBox error={debts.error} />}
              {debts.isPending ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
              ) : !debts.data?.length ? (
                <Empty icon={HandCoins} title={q ? t('common.nothingFound') : t('debt.emptyFiltered')} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {debts.data.map((d) => <DebtCard key={d.id} d={d} {...actions.handlers} onOpenCustomer={(id) => set({ customer: String(id) })} />)}
                </div>
              )}
            </>
          ) : (
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {customers.isPending && <Skeleton className="m-4 h-16" />}
              {customers.data?.length === 0 && <div className="p-10 text-center text-sm text-slate-500">{t('common.nothingFound')}</div>}
              {customers.data?.map((c, i) => (
                <motion.button key={c.id} type="button" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  onClick={() => set({ customer: String(c.id) })} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-slate-50">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${c.overdue_count ? 'bg-rose-100 text-rose-700' : c.remaining ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.name[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {c.phone || '—'}
                      {c.open_count > 0 && ` · ${t('debt.c.open', { n: c.open_count })}`}
                      {c.next_due && ` · ${t('debt.c.next', { d: fmtDay(c.next_due) })}`}
                    </span>
                  </span>
                  <span className="text-right">
                    {c.remaining ? <span className={`block font-bold tabular-nums ${c.overdue_count ? 'text-rose-600' : ''}`}>{money(c.remaining)}</span>
                      : <span className="text-xs text-slate-400">{t('debt.c.noDebt')}</span>}
                    {c.overdue_count > 0 && <span className="text-[11px] font-semibold text-rose-500">{t('debt.overdueSub', { n: c.overdue_count })}</span>}
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </motion.button>
              ))}
            </div>
          )}
        </>
      )}

      {actions.dialogs(shop)}
      <DebtModal wid={wid} open={creating} onClose={() => setCreating(false)} />
      <CustomerDrawer wid={wid} customerId={customerId} shop={shop} onClose={() => set({ customer: '' })} />
    </div>
  );
}
