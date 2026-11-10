import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronRight, HandCoins, PackageX, TrendingUp, Wallet } from 'lucide-react';
import { useDashboard, useDebtSummary } from '../../hooks/queries';
import { useLang, useT } from '../../i18n';
import { longDate } from '../../i18n/dates';
import { COLORS, MOVEMENT_STYLE, money, moneyShort, num, timeAgo } from '../../lib/format';
import type { MovementType } from '../../types/api';
import { CountUp, ErrorBox, Skeleton } from '../../components/ui';
import { stagger } from '../../lib/motion';
import MovementModal from '../../components/MovementModal';
import PageHeader from './Header';
import { useWid } from './useWid';

export function MovementIcon({ type }: { type: MovementType }) {
  const Icon = type === 'in' ? ArrowDownToLine : type === 'out' ? ArrowUpFromLine : Boxes;
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${MOVEMENT_STYLE[type].cls}`}><Icon size={16} /></span>;
}

function FlowChart({ daily }: { daily: { day: string; in_qty: number; out_qty: number; in_value: number; out_value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = useT();
  const lang = useLang();
  const max = Math.max(1, ...daily.flatMap((d) => [d.in_value, d.out_value]));
  return (
    <div>
      <div className="relative mt-6 flex h-56 items-end gap-1 sm:gap-2" onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map((g) => <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `${g * 100}%` }} />)}
        {daily.map((d, i) => (
          <div key={d.day} className="relative flex h-full flex-1 cursor-pointer items-end justify-center gap-[2px] sm:gap-1" onMouseEnter={() => setHover(i)}>
            <motion.div className="w-1/2 max-w-3 rounded-t-md bg-emerald-500" initial={{ height: 0 }} animate={{ height: `${Math.max(1.5, (d.in_value / max) * 100)}%` }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 140, damping: 18 }} style={{ opacity: hover === null || hover === i ? 1 : 0.35 }} />
            <motion.div className="w-1/2 max-w-3 rounded-t-md bg-rose-400" initial={{ height: 0 }} animate={{ height: `${Math.max(1.5, (d.out_value / max) * 100)}%` }}
              transition={{ delay: i * 0.03 + 0.05, type: 'spring', stiffness: 140, damping: 18 }} style={{ opacity: hover === null || hover === i ? 1 : 0.35 }} />
            {hover === i && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`pointer-events-none absolute bottom-full z-10 mb-2 w-44 rounded-xl bg-ink-900 p-3 text-xs text-white shadow-xl ${i > daily.length / 2 ? 'right-0' : 'left-0'}`}>
                <div className="mb-1.5 font-semibold">{longDate(lang, d.day, false)}</div>
                <div className="flex justify-between"><span className="text-emerald-300">{t('mv.in')}</span><span>{moneyShort(d.in_value)}</span></div>
                <div className="flex justify-between"><span className="text-rose-300">{t('mv.out')}</span><span>{moneyShort(d.out_value)}</span></div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">{daily.map((d) => <div key={d.day} className="flex-1 text-center text-[10px] text-slate-400">{d.day.slice(8)}</div>)}</div>
    </div>
  );
}

export default function Dashboard() {
  const wid = useWid();
  const { data: d, isPending, error } = useDashboard(wid);
  const [mv, setMv] = useState<MovementType | null>(null);
  const t = useT();
  const debts = useDebtSummary(wid).data;

  const actions = (
    <>
      <button className="btn-in" onClick={() => setMv('in')}><ArrowDownToLine size={18} /> {t('mv.in')}</button>
      <button className="btn-out" onClick={() => setMv('out')}><ArrowUpFromLine size={18} /> {t('mv.out')}</button>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('dash.title')} actions={actions} />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : d && (
        <>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[
              { icon: Wallet, label: t('dash.value'), value: d.stock_value, fmt: (n: number) => `${moneyShort(n)} ${t('common.currency')}`, sub: t('dash.valueSub', { v: `${moneyShort(d.potential_revenue)} ${t('common.currency')}` }), cls: 'from-brand-500 to-indigo-600' },
              { icon: Boxes, label: t('dash.types'), value: d.product_count, fmt: num, sub: t('dash.typesSub', { n: num(d.total_quantity) }), cls: 'from-emerald-500 to-teal-600' },
              { icon: AlertTriangle, label: t('dash.low'), value: d.low_stock_count, fmt: num, sub: t('dash.lowSub'), cls: 'from-amber-400 to-orange-500' },
              { icon: PackageX, label: t('dash.out'), value: d.out_of_stock_count, fmt: num, sub: t('dash.outSub'), cls: 'from-rose-500 to-pink-600' },
            ].map((s) => (
              <motion.div key={s.label} variants={stagger.item} whileHover={{ y: -4 }} className="card relative overflow-hidden p-4 sm:p-5">
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.cls} opacity-10`} />
                <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.cls} text-white shadow-lg sm:h-11 sm:w-11`}><s.icon size={20} /></div>
                <div className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">{s.label}</div>
                <div className="text-lg font-extrabold tracking-tight sm:text-2xl"><CountUp value={s.value} format={s.fmt} /></div>
                <div className="mt-1 truncate text-[11px] text-slate-400 sm:text-xs">{s.sub}</div>
              </motion.div>
            ))}
          </motion.div>

          {debts && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Link to={`/omborlar/${wid}/qarzdorlar`}
                className={`card group flex flex-wrap items-center gap-4 p-4 transition hover:shadow-lg sm:p-5 ${debts.overdue_count ? 'ring-rose-200' : ''}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-lg ${debts.overdue_count ? 'bg-gradient-to-br from-rose-500 to-pink-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}><HandCoins size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-500">{t('dash.debts')}</div>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-xl font-extrabold">{money(debts.outstanding)}</span>
                    <span className="text-sm text-slate-500">{debts.debtors_count ? t('dash.debtsSub', { n: debts.debtors_count }) : t('dash.noDebts')}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {debts.overdue_count > 0 && <span className="badge bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-rose-200">{t('dash.overdueN', { n: debts.overdue_count })}</span>}
                  {debts.due_today_count > 0 && <span className="badge bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200">{t('dash.todayN', { n: debts.due_today_count })}</span>}
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-brand-600">{t('dash.toDebts')}<ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></span>
              </Link>
            </motion.div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-bold">{t('dash.flow')}</h2><p className="text-sm text-slate-500">{t('dash.flowSub')}</p></div>
                <div className="flex gap-4 text-sm">
                  <div><div className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('dash.in30')}</div><div className="font-bold">{moneyShort(d.month_in_value)}</div></div>
                  <div><div className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> {t('dash.out30')}</div><div className="font-bold">{moneyShort(d.month_out_value)}</div></div>
                </div>
              </div>
              <FlowChart daily={d.daily} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
              <h2 className="flex items-center gap-2 font-bold"><AlertTriangle size={18} className="text-amber-500" /> {t('dash.refill')}</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {!d.low_stock.length && <p className="py-6 text-center text-sm text-slate-500">{t('dash.allGood')}</p>}
                {d.low_stock.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }} className="py-2.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className={`shrink-0 font-bold tabular-nums ${p.quantity === 0 ? 'text-rose-600' : 'text-amber-600'}`}>{num(p.quantity)} {p.unit}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div className={`h-full rounded-full ${p.quantity === 0 ? 'bg-rose-500' : 'bg-amber-400'}`} initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (p.quantity / Math.max(1, p.min_quantity)) * 100)}%` }} transition={{ delay: 0.4 + i * 0.04, duration: 0.6 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
              {d.low_stock_count > 0 && <Link to={`/omborlar/${wid}/mahsulotlar?stock=low`} className="mt-3 block text-sm font-semibold text-brand-600 hover:underline">{t('dash.seeAll')}</Link>}
            </motion.div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-6">
              <div className="flex items-center justify-between"><h2 className="font-bold">{t('dash.recent')}</h2><Link to={`/omborlar/${wid}/harakatlar`} className="text-sm font-semibold text-brand-600 hover:underline">{t('dash.all')}</Link></div>
              <div className="mt-3 divide-y divide-slate-100">
                {!d.recent.length && <p className="py-6 text-center text-sm text-slate-500">{t('dash.noMoves')}</p>}
                {d.recent.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <MovementIcon type={m.type} />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{m.product_name}{m.product_id === null && <span className="badge ml-1.5 bg-slate-100 align-middle text-[10px] text-slate-500">{t('mvp.deletedBadge')}</span>}</div><div className="truncate text-xs text-slate-400">{t(`mv.${m.type}`)}{m.debt_id && ` · ${t('mvp.credit')}`}{m.counterparty && ` · ${m.counterparty}`} · {timeAgo(m.created_at)}</div></div>
                    <div className="text-right"><div className={`text-sm font-bold tabular-nums ${m.delta > 0 ? 'text-emerald-600' : m.delta < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{m.delta > 0 ? '+' : ''}{num(m.delta)} {m.unit}</div><div className="text-xs text-slate-400">{money(m.quantity * m.price)}</div></div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
              <div className="flex items-center gap-2"><TrendingUp size={18} className="text-brand-600" /><h2 className="font-bold">{t('dash.cats')}</h2></div>
              {d.categories.length > 0 && (
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {d.categories.map((c, i) => (
                    <motion.div key={c.name} className={COLORS[c.color].bar} initial={{ width: 0 }} animate={{ width: `${(c.stock_value / Math.max(1, d.stock_value)) * 100}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.6 }} />
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-2.5">
                {!d.categories.length && <p className="py-6 text-center text-sm text-slate-500">{t('dash.noProducts')}</p>}
                {d.categories.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[c.color].dot}`} />
                    <span className="flex-1 truncate">{c.name === 'Kategoriyasiz' ? t('cat.none') : c.name} <span className="text-slate-400">({c.product_count})</span></span>
                    <span className="font-semibold tabular-nums">{moneyShort(c.stock_value)}</span>
                    <span className="w-10 text-right text-xs text-slate-400">{Math.round((c.stock_value / Math.max(1, d.stock_value)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
      <MovementModal wid={wid} open={mv !== null} type={mv ?? 'in'} onClose={() => setMv(null)} />
    </div>
  );
}
