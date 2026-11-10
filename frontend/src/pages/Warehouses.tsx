import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowUpRight, Boxes, MapPin, Plus, Wallet, Warehouse as WarehouseIcon } from 'lucide-react';
import { useWarehouses } from '../hooks/queries';
import { useAppSelector } from '../store/hooks';
import { COLORS, moneyShort, num, timeAgo } from '../lib/format';
import { CountUp, Empty, ErrorBox, Skeleton } from '../components/ui';
import { useT } from '../i18n';
import { stagger } from '../lib/motion';
import WarehouseModal from '../components/WarehouseModal';

export default function Warehouses() {
  const { data, isPending, error } = useWarehouses();
  const user = useAppSelector((s) => s.auth.user);
  const [creating, setCreating] = useState(false);
  const t = useT();
  const total = (k: 'stock_value' | 'product_count' | 'low_stock_count') => data?.reduce((s, w) => s + w[k], 0) ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{t('wh.hello', { name: user?.name.split(' ')[0] ?? '' })}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t('wh.title')}</h1>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> {t('nav.newWarehouse')}</button>
      </div>

      {error && <ErrorBox error={error} className="mt-6" />}

      {!!data?.length && (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, label: t('wh.totalValue'), value: total('stock_value'), fmt: (n: number) => `${moneyShort(n)} ${t('common.currency')}`, cls: 'from-brand-500 to-indigo-600' },
            { icon: Boxes, label: t('wh.productTypes'), value: total('product_count'), fmt: num, cls: 'from-emerald-500 to-teal-600' },
            { icon: AlertTriangle, label: t('wh.lowCount'), value: total('low_stock_count'), fmt: num, cls: 'from-amber-400 to-orange-500' },
          ].map((s) => (
            <motion.div key={s.label} variants={stagger.item} className="card flex items-center gap-4 p-5">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${s.cls} text-white shadow-lg`}><s.icon size={22} /></div>
              <div><div className="text-sm text-slate-500">{s.label}</div><div className="text-2xl font-bold"><CountUp value={s.value} format={s.fmt} /></div></div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
        ) : data && !data.length ? (
          <Empty icon={WarehouseIcon} title={t('wh.emptyTitle')} text={t('wh.emptyText')}>
            <button className="btn-primary px-6 py-3" onClick={() => setCreating(true)}><Plus size={18} /> {t('wh.open')}</button>
          </Empty>
        ) : (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data?.map((w) => (
              <motion.div key={w.id} variants={stagger.item} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <Link to={`/omborlar/${w.id}`} className="card group relative block overflow-hidden p-6 transition-shadow hover:shadow-xl">
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${COLORS[w.color].grad}`} />
                  <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${COLORS[w.color].grad} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${COLORS[w.color].grad} text-white shadow-lg`}><WarehouseIcon size={22} /></div>
                    <ArrowUpRight className="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-900" />
                  </div>
                  <h3 className="relative mt-4 truncate text-lg font-bold">{w.name}</h3>
                  <p className="relative flex items-center gap-1 truncate text-sm text-slate-500"><MapPin size={14} className="shrink-0" /> {w.address || t('wh.noAddress')}</p>
                  <div className="relative mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                    <div><div className="text-[11px] text-slate-400">{t('wh.products')}</div><div className="font-bold">{num(w.product_count)}</div></div>
                    <div><div className="text-[11px] text-slate-400">{t('wh.value')}</div><div className="font-bold">{moneyShort(w.stock_value)}</div></div>
                    <div><div className="text-[11px] text-slate-400">{t('wh.low')}</div><div className={`font-bold ${w.low_stock_count ? 'text-amber-600' : ''}`}>{w.low_stock_count}</div></div>
                  </div>
                  <div className="relative mt-3 text-xs text-slate-400">{w.last_movement_at ? t('wh.lastMove', { t: timeAgo(w.last_movement_at) }) : t('wh.noMoves')}</div>
                </Link>
              </motion.div>
            ))}
            <motion.button variants={stagger.item} onClick={() => setCreating(true)} whileHover={{ scale: 1.02 }}
              className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><Plus /></span>
              <span className="font-semibold">{t('wh.addNew')}</span>
            </motion.button>
          </motion.div>
        )}
      </div>
      <WarehouseModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
