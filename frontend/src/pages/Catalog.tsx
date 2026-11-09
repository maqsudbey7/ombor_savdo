import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useCategories, useProducts } from '../hooks/queries';
import type { SortBy } from '../types/api';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, Spinner } from '../components/ui';

const SORTS: [SortBy, string][] = [['recommended', 'Saralash: tavsiya'], ['price_asc', 'Arzonroq'], ['price_desc', 'Qimmatroq'], ['new', 'Yangi'], ['name', 'Nomi (A–Z)']];

export default function Catalog() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const category = sp.get('category') ?? '';
  const sort = (sp.get('sort') as SortBy) || 'recommended';
  const inStock = sp.get('in_stock') === '1';

  const cats = useCategories();
  const products = useProducts({ q: q || undefined, category: category || undefined, sort, in_stock: inStock });

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v); else n.delete(k);
    setSp(n, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Katalog</h1>
          <p className="text-sm text-slate-500">{q ? `“${q}” bo‘yicha natijalar` : 'Barcha ulgurji mahsulotlar'}{products.data && ` · ${products.data.length} ta`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer"><input type="checkbox" className="accent-brand-600" checked={inStock} onChange={(e) => set('in_stock', e.target.checked ? '1' : '')} /> Faqat mavjud</label>
          <select className="input w-auto" value={sort} onChange={(e) => set('sort', e.target.value === 'recommended' ? '' : e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {[{ slug: '', name: 'Hammasi', icon: '✨' }, ...(cats.data ?? [])].map((c) => (
          <button key={c.slug} onClick={() => set('category', c.slug)}
            className={`btn shrink-0 rounded-full px-4 py-2 ${category === c.slug ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            <span>{c.icon}</span>{c.name}
          </button>
        ))}
        {q && <button className="btn shrink-0 rounded-full bg-brand-50 px-4 py-2 text-brand-700" onClick={() => set('q', '')}>“{q}” ✕</button>}
      </div>
      <div className="mt-6">
        {products.isPending ? <Spinner /> : products.isError ? <ErrorBox error={products.error} /> : !products.data.length ? (
          <Empty icon={SearchX} title="Hech narsa topilmadi" text="Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.data.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
    </div>
  );
}
