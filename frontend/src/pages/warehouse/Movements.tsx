import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, History } from 'lucide-react';
import { useMovements } from '../../hooks/queries';
import { money, num } from '../../lib/format';
import { translate, useLang, useT, type Lang, type TKey } from '../../i18n';
import { longDate } from '../../i18n/dates';
import type { Movement, MovementType } from '../../types/api';
import { Empty, ErrorBox, Skeleton } from '../../components/ui';
import MovementModal from '../../components/MovementModal';
import { MovementIcon } from './Dashboard';
import PageHeader from './Header';
import { useWid } from './useWid';

const TABS: [MovementType | '', TKey][] = [['', 'common.all'], ['in', 'mv.in'], ['out', 'mv.out'], ['adjust', 'mv.adjust']];

function dayLabel(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return translate(lang, 'common.today');
  if (d.toDateString() === y.toDateString()) return translate(lang, 'common.yesterday');
  return longDate(lang, d);
}

export default function Movements() {
  const wid = useWid();
  const [type, setType] = useState<MovementType | ''>('');
  const { data, isPending, error } = useMovements(wid, { type: type || undefined, limit: 300 });
  const [mv, setMv] = useState<MovementType | null>(null);
  const t = useT();
  const lang = useLang();

  const groups = useMemo(() => {
    const g: { label: string; items: Movement[] }[] = [];
    for (const m of data ?? []) {
      const label = dayLabel(m.created_at, lang);
      if (g.at(-1)?.label === label) g.at(-1)!.items.push(m); else g.push({ label, items: [m] });
    }
    return g;
  }, [data, lang]);
  const sum = (t: MovementType) => (data ?? []).filter((m) => m.type === t).reduce((s, m) => s + m.quantity * m.price, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('mvp.title')} actions={
        <>
          <button className="btn-in" onClick={() => setMv('in')}><ArrowDownToLine size={18} /> {t('mv.in')}</button>
          <button className="btn-out" onClick={() => setMv('out')}><ArrowUpFromLine size={18} /> {t('mv.out')}</button>
          <button className="btn-ghost" onClick={() => setMv('adjust')}><ClipboardCheck size={18} className="text-amber-500" /> <span className="hidden sm:inline">{t('mv.adjust')}</span></button>
        </>
      } />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setType(k)} className={`relative shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${type === k ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {type === k && <motion.span layoutId="mv-tab" className="absolute inset-0 rounded-lg bg-ink-900" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{t(l)}</span>
            </button>
          ))}
        </div>
        {!!data?.length && (
          <div className="flex gap-4 text-sm">
            {type !== 'out' && type !== 'adjust' && <span className="text-slate-500">{t('mvp.sumIn')} <b className="text-emerald-600">{money(sum('in'))}</b></span>}
            {type !== 'in' && type !== 'adjust' && <span className="text-slate-500">{t('mvp.sumOut')} <b className="text-rose-600">{money(sum('out'))}</b></span>}
          </div>
        )}
      </div>

      {error && <ErrorBox error={error} />}
      {isPending ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !groups.length ? (
        <Empty icon={History} title={t('mvp.emptyTitle')} text={t('mvp.emptyText')}>
          <button className="btn-in" onClick={() => setMv('in')}><ArrowDownToLine size={18} /> {t('mvp.first')}</button>
        </Empty>
      ) : (
        <div className="space-y-6">
          {groups.map((g, gi) => (
            <motion.div key={g.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi, 6) * 0.05 }}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
              <div className="card divide-y divide-slate-100">
                {g.items.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                    <MovementIcon type={m.type} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{m.product_name}{m.product_id === null && <span className="ml-1 text-xs font-normal text-slate-400">{t('mvp.deleted')}</span>}
                        {m.debt_id && <span className="badge ml-2 bg-amber-50 align-middle text-[10px] text-amber-700 ring-1 ring-amber-200">{t('mvp.credit')}</span>}</div>
                      <div className="truncate text-xs text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {t(`mv.${m.type}`)}
                        {m.counterparty && ` · ${m.counterparty}`}{m.note && ` · ${m.note}`}
                      </div>
                    </div>
                    <div className="hidden text-right text-xs text-slate-400 sm:block">{m.type !== 'adjust' && <>{num(m.quantity)} × {money(m.price)}<div className="font-semibold text-slate-600">{money(m.quantity * m.price)}</div></>}</div>
                    <div className="w-28 text-right">
                      <div className={`font-bold tabular-nums ${m.delta > 0 ? 'text-emerald-600' : m.delta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{m.delta > 0 ? '+' : ''}{num(m.delta)} {m.unit}</div>
                      <div className="text-[11px] text-slate-400">{t('mvp.balance', { n: num(m.balance_after) })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <MovementModal wid={wid} open={mv !== null} type={mv ?? 'in'} onClose={() => setMv(null)} />
    </div>
  );
}
