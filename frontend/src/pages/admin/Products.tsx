import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react';
import { useAdminProducts, useCategories, useCreateCategory, useDeleteCategory, useDeleteProduct, usePatchStock, useSaveProduct } from '../../hooks/queries';
import { useAppDispatch } from '../../store/hooks';
import { toast } from '../../store/uiSlice';
import { fmt } from '../../lib/format';
import type { Category, Product, ProductPayload } from '../../types/api';
import { ErrorBox, ProductImage, Spinner } from '../../components/ui';

/** Forma holati: raqamli maydonlar input uchun string sifatida saqlanadi. */
interface FormState {
  name: string; sku: string; description: string; category_id: string; image_url: string; unit: string;
  pack_size: string; stock: string; moq: string; base_price: string; is_active: boolean;
  tiers: { min_qty: string; price: string }[];
}

const toForm = (p?: Product): FormState => ({
  name: p?.name ?? '', sku: p?.sku ?? '', description: p?.description ?? '', category_id: p?.category_id ? String(p.category_id) : '',
  image_url: p?.image_url ?? '', unit: p?.unit ?? 'quti', pack_size: String(p?.pack_size ?? 1), stock: String(p?.stock ?? 0),
  moq: String(p?.moq ?? 1), base_price: p ? String(p.base_price) : '', is_active: p?.is_active ?? true,
  tiers: p?.tiers.map((t) => ({ min_qty: String(t.min_qty), price: String(t.price) })) ?? [],
});

const toPayload = (f: FormState): ProductPayload => ({
  name: f.name.trim(), sku: f.sku.trim(), description: f.description, category_id: f.category_id ? Number(f.category_id) : null,
  image_url: f.image_url.trim() || null, unit: f.unit.trim(), pack_size: Number(f.pack_size), stock: Number(f.stock),
  moq: Number(f.moq), base_price: Number(f.base_price), is_active: f.is_active,
  tiers: f.tiers.filter((t) => t.min_qty && t.price).map((t) => ({ min_qty: Number(t.min_qty), price: Number(t.price) })),
});

function ProductForm({ product, cats, onClose }: { product?: Product; cats: Category[]; onClose: () => void }) {
  const [f, setF] = useState<FormState>(() => toForm(product));
  const save = useSaveProduct();
  const dispatch = useAppDispatch();
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const setTier = (i: number, k: 'min_qty' | 'price', v: string) => set('tiers', f.tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ id: product?.id, data: toPayload(f) }, {
      onSuccess: () => { dispatch(toast('Saqlandi')); onClose(); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold">{product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Yopish"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div><label className="label">Nomi *</label><input required minLength={2} className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">SKU *</label><input required className="input" value={f.sku} onChange={(e) => set('sku', e.target.value)} /></div>
            <div><label className="label">Kategoriya</label>
              <select className="input" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Tavsif</label><textarea rows={3} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div><label className="label">Rasm URL</label><input type="url" className="input" placeholder="https://…" value={f.image_url} onChange={(e) => set('image_url', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><label className="label">O‘lchov</label><input required className="input" value={f.unit} onChange={(e) => set('unit', e.target.value)} /></div>
            <div><label className="label">Ichida (dona)</label><input required type="number" min={1} className="input" value={f.pack_size} onChange={(e) => set('pack_size', e.target.value)} /></div>
            <div><label className="label">Qoldiq</label><input required type="number" min={0} className="input" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>
            <div><label className="label">Min. buyurtma</label><input required type="number" min={1} className="input" value={f.moq} onChange={(e) => set('moq', e.target.value)} /></div>
          </div>
          <div><label className="label">Asosiy narx (so‘m / {f.unit || 'birlik'}) *</label><input required type="number" min={1} className="input" value={f.base_price} onChange={(e) => set('base_price', e.target.value)} /></div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Ulgurji narx pog‘onalari</label>
              <button type="button" className="text-sm font-semibold text-brand-600" onClick={() => set('tiers', [...f.tiers, { min_qty: '', price: '' }])}>+ Qo‘shish</button>
            </div>
            <div className="space-y-2">
              {!f.tiers.length && <p className="text-sm text-slate-400">Pog‘ona yo‘q — barcha miqdorga asosiy narx.</p>}
              {f.tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="number" min={1} className="input" placeholder="dan (miqdor)" value={t.min_qty} onChange={(e) => setTier(i, 'min_qty', e.target.value)} />
                  <input type="number" min={1} className="input" placeholder="narx" value={t.price} onChange={(e) => setTier(i, 'price', e.target.value)} />
                  <button type="button" className="btn-danger px-3" aria-label="Pog‘onani o‘chirish" onClick={() => set('tiers', f.tiers.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Sotuvda ko‘rinsin</label>
          {save.error && <ErrorBox error={save.error} />}
        </div>
        <div className="flex gap-3 border-t border-slate-100 p-6">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Bekor qilish</button>
          <button disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        </div>
      </form>
    </div>
  );
}

function CategoriesModal({ cats, onClose }: { cats: Category[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const create = useCreateCategory();
  const remove = useDeleteCategory();
  const add = (e: FormEvent) => { e.preventDefault(); create.mutate({ name, icon }, { onSuccess: () => setName('') }); };
  const del = (c: Category) => { if (confirm(`"${c.name}" kategoriyasini o‘chirasizmi? Mahsulotlar kategoriyasiz qoladi.`)) remove.mutate(c.id); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Kategoriyalar</h2><button onClick={onClose} aria-label="Yopish"><X size={20} /></button></div>
        <div className="mt-4 divide-y divide-slate-100">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span>{c.icon} {c.name} <span className="text-slate-400">({c.product_count})</span></span>
              <button className="text-slate-400 hover:text-rose-500" onClick={() => del(c)} aria-label="O‘chirish"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input className="input w-16 text-center" value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="Belgi" />
          <input required minLength={2} className="input" placeholder="Yangi kategoriya" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary" disabled={create.isPending} aria-label="Qo‘shish"><Plus size={16} /></button>
        </form>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const products = useAdminProducts();
  const cats = useCategories();
  const patchStock = usePatchStock();
  const remove = useDeleteProduct();
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [q, setQ] = useState('');

  const del = (p: Product) => {
    if (confirm(`"${p.name}" o‘chirilsinmi?`)) remove.mutate(p.id, { onSuccess: () => dispatch(toast('O‘chirildi')) });
  };
  const list = products.data?.filter((p) => !q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mahsulotlar va ombor</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setCatsOpen(true)}><Tags size={16} /> Kategoriyalar</button>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Mahsulot qo‘shish</button>
        </div>
      </div>
      <div className="relative mt-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {products.isPending ? <Spinner /> : products.isError ? <div className="mt-4"><ErrorBox error={products.error} /></div> : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Mahsulot</th><th className="px-4 py-3">Kategoriya</th><th className="px-4 py-3 text-right">Narx</th><th className="px-4 py-3 text-center">Qoldiq</th><th className="px-4 py-3 text-center">Holat</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage product={p} className="h-11 w-11 shrink-0 rounded-lg [&>span]:text-xl" />
                      <div><div className="font-medium">{p.name}</div><div className="text-xs text-slate-400">{p.sku} · min {p.moq} {p.unit}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right"><div className="font-semibold">{fmt(p.base_price)}</div>{p.tiers.length > 0 && <div className="text-xs text-emerald-600">{p.tiers.length} pog‘ona</div>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="h-7 w-7 rounded-lg ring-1 ring-slate-200 hover:bg-white" disabled={patchStock.isPending} onClick={() => patchStock.mutate({ id: p.id, delta: -10 })} aria-label="Qoldiqni 10 ga kamaytirish">−</button>
                      <span className={`w-20 text-center font-semibold ${p.stock === 0 ? 'text-rose-600' : p.stock < p.moq * 3 ? 'text-amber-600' : ''}`}>{p.stock} {p.unit}</span>
                      <button className="h-7 w-7 rounded-lg ring-1 ring-slate-200 hover:bg-white" disabled={patchStock.isPending} onClick={() => patchStock.mutate({ id: p.id, delta: 10 })} aria-label="Qoldiqni 10 ga oshirish">+</button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`badge ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'Sotuvda' : 'Yashirin'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-600" onClick={() => setEditing(p)} aria-label="Tahrirlash"><Pencil size={16} /></button>
                      <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => del(p)} aria-label="O‘chirish"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ProductForm product={editing === 'new' ? undefined : editing} cats={cats.data ?? []} onClose={() => setEditing(null)} />}
      {catsOpen && <CategoriesModal cats={cats.data ?? []} onClose={() => setCatsOpen(false)} />}
    </div>
  );
}
