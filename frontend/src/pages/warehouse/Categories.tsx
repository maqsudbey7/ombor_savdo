import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useCategories, useDeleteCategory, useSaveCategory } from '../../hooks/queries';
import { COLORS } from '../../lib/format';
import type { Category, Color } from '../../types/api';
import { ColorPicker, Empty, ErrorBox, Field, Modal, Skeleton } from '../../components/ui';
import { useT } from '../../i18n';
import PageHeader from './Header';
import { useWid } from './useWid';

function CategoryForm({ wid, category, onDone }: { wid: number; category?: Category; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<Color>(category?.color ?? 'blue');
  const save = useSaveCategory(wid);
  const t = useT();
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate({ id: category?.id, data: { name, color } }, { onSuccess: onDone }); };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('cat.name')}><input autoFocus required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('cat.namePh')} /></Field>
      <div><span className="label">{t('common.color')}</span><ColorPicker value={color} onChange={setColor} /></div>
      {save.error && <ErrorBox error={save.error} />}
      <button disabled={save.isPending} className="btn-primary w-full py-3">{save.isPending ? t('common.saving') : t('common.save')}</button>
    </form>
  );
}

export default function Categories() {
  const wid = useWid();
  const { data, isPending, error } = useCategories(wid);
  const remove = useDeleteCategory(wid);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const t = useT();
  const del = (c: Category) => { if (confirm(t('cat.confirmDelete', { name: c.name }))) remove.mutate(c.id); };

  return (
    <div className="space-y-6">
      <PageHeader title={t('cat.title')} actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> {t('cat.add')}</button>} />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !data?.length ? (
        <Empty icon={Tags} title={t('cat.emptyTitle')} text={t('cat.emptyText')}>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> {t('cat.addBtn')}</button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {data.map((c, i) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03 }} className="card group flex items-center gap-4 p-5">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${COLORS[c.color].grad} text-white shadow-lg`}><Tags size={20} /></div>
                <Link to={`/omborlar/${wid}/mahsulotlar?category=${c.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold hover:text-brand-600">{c.name}</div>
                  <div className="text-sm text-slate-500">{t('cat.count', { n: c.product_count })}</div>
                </Link>
                <div className="flex gap-0.5 opacity-60 transition group-hover:opacity-100">
                  <button className="icon-btn" aria-label={t('common.edit')} onClick={() => setEditing(c)}><Pencil size={16} /></button>
                  <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" aria-label={t('common.delete')} onClick={() => del(c)}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('cat.new') : t('cat.edit')}>
        {editing !== null && <CategoryForm wid={wid} category={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
