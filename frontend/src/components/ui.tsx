import type { ComponentType, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Minus, Plus, type LucideProps } from 'lucide-react';
import type { Product } from '../types/api';
import { useAppSelector } from '../store/hooks';

const GRADS = ['from-sky-100 to-blue-200', 'from-emerald-100 to-teal-200', 'from-amber-100 to-orange-200', 'from-rose-100 to-pink-200', 'from-violet-100 to-indigo-200', 'from-lime-100 to-green-200'];

type ImgProduct = Pick<Product, 'id' | 'name' | 'image_url' | 'category_id' | 'category'>;

export function ProductImage({ product, className = '' }: { product: ImgProduct; className?: string }) {
  if (product.image_url) return <img src={product.image_url} alt={product.name} className={`object-cover ${className}`} loading="lazy" />;
  const g = GRADS[(product.category_id ?? product.id) % GRADS.length];
  return (
    <div className={`grid place-items-center bg-gradient-to-br ${g} ${className}`}>
      <span className="text-5xl drop-shadow-sm">{product.category?.icon ?? '📦'}</span>
    </div>
  );
}

interface QtyProps { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md' }

export function QtyInput({ value, onChange, min = 1, max = 99999, size = 'md' }: QtyProps) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.floor(v) || min));
  return (
    <div className={`inline-flex ${h} items-center rounded-xl bg-white ring-1 ring-slate-200`}>
      <button type="button" aria-label="Kamaytirish" className="grid h-full w-9 place-items-center text-slate-500 hover:text-brand-600 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}><Minus size={16} /></button>
      <input className="h-full w-16 border-0 bg-transparent text-center text-sm font-semibold focus:outline-none" value={value} inputMode="numeric"
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} onBlur={(e) => onChange(clamp(Number(e.target.value)))} />
      <button type="button" aria-label="Ko‘paytirish" className="grid h-full w-9 place-items-center text-slate-500 hover:text-brand-600 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}><Plus size={16} /></button>
    </div>
  );
}

export function StockBadge({ p }: { p: Pick<Product, 'stock' | 'moq' | 'unit'> }) {
  if (p.stock <= 0) return <span className="badge bg-slate-100 text-slate-500">Tugagan</span>;
  if (p.stock < p.moq * 3) return <span className="badge bg-amber-50 text-amber-700">Kam qoldi: {p.stock} {p.unit}</span>;
  return <span className="badge bg-emerald-50 text-emerald-700">Omborda: {p.stock} {p.unit}</span>;
}

export function Toasts() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-4">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg animate-[fadein_.2s_ease-out]">
          {t.type === 'err' ? <AlertCircle size={18} className="text-rose-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

interface EmptyProps { icon: ComponentType<LucideProps>; title: string; text?: string; children?: ReactNode }

export function Empty({ icon: Icon, title, text, children }: EmptyProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export const Spinner = () => (
  <div className="grid place-items-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" /></div>
);

export const ErrorBox = ({ error }: { error: Error }) => (
  <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error.message}</div>
);
