import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, ArrowUpFromLine, Download, MapPin, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { productsApi } from '../../api/endpoints';
import { useCategories, useDeleteProduct, useProducts, useWarehouse } from '../../hooks/queries';
import { useAppDispatch } from '../../store/hooks';
import { toast } from '../../store/uiSlice';
import { COLORS, money, moneyShort, num } from '../../lib/format';
import { useT, type TKey } from '../../i18n';
import type { MovementType, Product, ProductSort, StockFilter } from '../../types/api';
import { Empty, ErrorBox, Skeleton, StockBadge } from '../../components/ui';
import ProductDrawer from '../../components/ProductDrawer';
import MovementModal from '../../components/MovementModal';
import PageHeader from './Header';
import { useWid } from './useWid';
import { confirmAsk } from '../../components/feedback';

const TABS: [StockFilter, TKey][] = [['all', 'common.all'], ['low', 'prod.tabLow'], ['out', 'prod.tabOut']];
const SORTS: ProductSort[] = ['name', 'new', 'qty_asc', 'qty_desc', 'value_desc'];

export default function Products() {
  const wid = useWid();
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const stock = (sp.get('stock') as StockFilter) || 'all';
  const sort = (sp.get('sort') as ProductSort) || 'name';
  const categoryId = Number(sp.get('category')) || undefined;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const products = useProducts(wid, { q: q || undefined, stock, sort, category_id: categoryId });
  const cats = useCategories(wid);
  const { data: wh } = useWarehouse(wid);
  const remove = useDeleteProduct(wid);
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [mv, setMv] = useState<{ type: MovementType; product?: Product } | null>(null);
  const [exporting, setExporting] = useState(false);
  const t = useT();

  const exportCsv = async () => {
    setExporting(true);
    try { await productsApi.exportCsv(wid, wh?.name ?? 'ombor'); dispatch(toast(t('prod.downloaded'))); }
    catch (e) { dispatch(toast((e as Error).message, 'err')); }
    finally { setExporting(false); }
  };
  const del = async (p: Product) => { if (await confirmAsk({ text: t('prod.confirmDelete', { name: p.name }) })) remove.mutate(p.id); };
  const list = products.data ?? [];
  const totalValue = list.reduce((s, p) => s + p.quantity * p.cost_price, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('prod.title')} actions={
        <>
          <button className="btn-ghost" onClick={exportCsv} disabled={exporting}><Download size={18} /> <span className="hidden sm:inline">{exporting ? t('common.loading') : 'Excel'}</span></button>
          <button className="btn-ghost" onClick={() => setMv({ type: 'in' })}><ArrowDownToLine size={18} className="text-emerald-600" /> <span className="hidden sm:inline">{t('mv.in')}</span></button>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> {t('prod.product')}</button>
        </>
      } />

      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={t('prod.searchPh')} value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => set('stock', k === 'all' ? '' : k)} className={`relative rounded-lg px-3.5 py-2 text-sm font-semibold transition ${stock === k ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {stock === k && <motion.span layoutId="stock-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{t(l)}</span>
              </button>
            ))}
          </div>
          <select className="input lg:w-48" value={categoryId ?? ''} onChange={(e) => set('category', e.target.value)} aria-label={t('prod.th.category')}>
            <option value="">{t('prod.allCats')}</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.product_count})</option>)}
          </select>
          <select className="input lg:w-52" value={sort} onChange={(e) => set('sort', e.target.value === 'name' ? '' : e.target.value)} aria-label="Sort">
            {SORTS.map((k) => <option key={k} value={k}>{t(`prod.sort.${k}`)}</option>)}
          </select>
        </div>
        {!!list.length && <div className="mt-3 text-xs text-slate-500">{t('prod.count', { n: list.length, v: money(totalValue) })}</div>}
      </div>

      {products.error && <ErrorBox error={products.error} />}
      {products.isPending ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !list.length ? (
        <Empty icon={Package} title={q || stock !== 'all' || categoryId ? t('common.nothingFound') : t('prod.emptyTitle')}
          text={q || stock !== 'all' || categoryId ? t('common.tryFilters') : t('prod.emptyText')}>
          {!q && stock === 'all' && !categoryId && <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> {t('prod.add')}</button>}
        </Empty>
      ) : (
        <>
          {/* Desktop: jadval */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr><th className="th">{t('prod.th.product')}</th><th className="th">{t('prod.th.category')}</th><th className="th text-right">{t('prod.th.stock')}</th><th className="th text-right">{t('prod.th.price')}</th><th className="th text-right">{t('prod.th.value')}</th><th className="th text-center">{t('prod.th.status')}</th><th className="th" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {list.map((p, i) => (
                    <motion.tr key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }} className="group hover:bg-slate-50/80">
                      <td className="td">
                        <div className="font-semibold">{p.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400"><span className="font-mono">{p.sku}</span>{p.location && <span className="flex items-center gap-0.5"><MapPin size={11} />{p.location}</span>}</div>
                      </td>
                      <td className="td">{p.category ? <span className={`badge ${COLORS[p.category.color].soft}`}>{p.category.name}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="td text-right"><span className="text-base font-bold tabular-nums">{num(p.quantity)}</span> <span className="text-slate-400">{p.unit}</span><div className="text-[11px] text-slate-400">{t('prod.min', { n: num(p.min_quantity) })}</div></td>
                      <td className="td text-right tabular-nums"><div>{moneyShort(p.cost_price)}</div><div className="text-xs text-slate-400">{t('prod.salePrice', { v: moneyShort(p.sale_price) })}</div></td>
                      <td className="td text-right font-semibold tabular-nums">{moneyShort(p.quantity * p.cost_price)}</td>
                      <td className="td text-center"><StockBadge p={p} /></td>
                      <td className="td">
                        <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                          <button className="icon-btn hover:bg-emerald-50 hover:text-emerald-600" title={t('mv.in')} aria-label={t('mv.in')} onClick={() => setMv({ type: 'in', product: p })}><ArrowDownToLine size={16} /></button>
                          <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" title={t('mv.out')} aria-label={t('mv.out')} onClick={() => setMv({ type: 'out', product: p })}><ArrowUpFromLine size={16} /></button>
                          <button className="icon-btn hover:bg-brand-50 hover:text-brand-600" title={t('common.edit')} aria-label={t('common.edit')} onClick={() => setEditing(p)}><Pencil size={16} /></button>
                          <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" title={t('common.delete')} aria-label={t('common.delete')} onClick={() => del(p)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobil: kartochkalar */}
          <div className="space-y-3 md:hidden">
            {list.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => setEditing(p)}>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.sku}{p.location && ` · ${p.location}`}{p.category && ` · ${p.category.name}`}</div>
                  </button>
                  <StockBadge p={p} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div><span className="text-2xl font-extrabold tabular-nums">{num(p.quantity)}</span> <span className="text-sm text-slate-400">{p.unit}</span><div className="text-xs text-slate-400">{money(p.quantity * p.cost_price)}</div></div>
                  <div className="flex gap-2">
                    <button className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600" aria-label={t('mv.in')} onClick={() => setMv({ type: 'in', product: p })}><ArrowDownToLine size={18} /></button>
                    <button className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600" aria-label={t('mv.out')} onClick={() => setMv({ type: 'out', product: p })}><ArrowUpFromLine size={18} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <ProductDrawer wid={wid} open={editing !== null} product={editing === 'new' || editing === null ? undefined : editing} onClose={() => setEditing(null)} />
      <MovementModal wid={wid} open={mv !== null} type={mv?.type} product={mv?.product} onClose={() => setMv(null)} />
    </div>
  );
}
