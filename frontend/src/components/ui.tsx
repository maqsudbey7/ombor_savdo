import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useInView } from 'motion/react';
import { AlertCircle, CheckCircle2, Warehouse as WarehouseIcon, X, type LucideProps } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLang } from '../store/uiSlice';
import { LANGS, useT } from '../i18n';
import { COLORS, COLOR_KEYS, num } from '../lib/format';
import type { Color, Product } from '../types/api';

// ---------- Logo ----------
export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-extrabold tracking-tight">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow">
        <WarehouseIcon size={18} />
      </span>
      {!compact && <span className={`text-lg ${dark ? 'text-white' : 'text-slate-900'}`}>Ombor<span className="text-brand-500">Savdo</span></span>}
    </span>
  );
}

// ---------- Loading / empty / error ----------
export const Spinner = ({ className = 'py-24' }: { className?: string }) => (
  <div className={`grid place-items-center ${className}`}>
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
  </div>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden rounded-xl bg-slate-200/70 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

interface EmptyProps { icon: ComponentType<LucideProps>; title: string; text?: string; children?: ReactNode }
export function Empty({ icon: Icon, title, text, children }: EmptyProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col items-center px-6 py-16 text-center">
      <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
        <Icon size={28} />
      </motion.div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </motion.div>
  );
}

export const ErrorBox = ({ error, className = '' }: { error: Error; className?: string }) => (
  <div className={`flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 ${className}`}>
    <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error.message}</span>
  </div>
);

// ---------- Toasts ----------
export function Toasts() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-ink-900/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
            {t.type === 'err' ? <AlertCircle size={18} className="text-rose-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Modal & Drawer ----------
interface OverlayProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer, wide }: OverlayProps) {
  useEsc(open, onClose);
  const t = useT();
  // Portal: modal sahifa animatsiyasi (transform) ichida qolib ketmasligi uchun body'ga chiqariladi
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer && <div className="flex gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer }: OverlayProps) {
  useEsc(open, onClose);
  const t = useT();
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-label={title}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer && <div className="flex gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------- Animatsiyali son ----------
export function CountUp({ value, format = num, className = '' }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(from.current, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(v) });
    from.current = value;
    return () => c.stop();
  }, [value, inView]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{format(shown)}</span>;
}

// ---------- Form yordamchilari ----------
export function ColorPicker({ value, onChange }: { value: Color; onChange: (c: Color) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_KEYS.map((c) => (
        <button key={c} type="button" title={t(`color.${c}`)} aria-label={t(`color.${c}`)} onClick={() => onChange(c)}
          className={`relative h-8 w-8 rounded-full bg-gradient-to-br ${COLORS[c].grad} transition hover:scale-110 ${value === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}>
          {value === c && <motion.span layoutId="color-dot" className="absolute inset-[9px] rounded-full bg-white" />}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function StockBadge({ p }: { p: Pick<Product, 'quantity' | 'min_quantity' | 'unit'> }) {
  const t = useT();
  if (p.quantity <= 0) return <span className="badge bg-rose-50 text-rose-600 ring-1 ring-rose-100">{t('stock.out')}</span>;
  if (p.quantity <= p.min_quantity) return (
    <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-100">
      <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-pulsering rounded-full bg-amber-500" /><span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" /></span>
      {t('stock.low')}
    </span>
  );
  return <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{t('stock.ok')}</span>;
}

// ---------- Til almashtirgich ----------
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const lang = useAppSelector((s) => s.ui.lang);
  const dispatch = useAppDispatch();
  return (
    <div className={`inline-flex rounded-lg p-0.5 text-xs font-bold ${dark ? 'bg-white/10' : 'bg-slate-100'}`} role="group" aria-label="Til / Язык">
      {LANGS.map((l) => (
        <button key={l.code} type="button" title={l.label} onClick={() => dispatch(setLang(l.code))}
          className={`relative rounded-md px-2.5 py-1 transition ${lang === l.code ? (dark ? 'text-ink-950' : 'text-slate-900') : dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          {lang === l.code && <motion.span layoutId={`lang-${dark ? 'd' : 'l'}`} className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <span className="relative">{l.short}</span>
        </button>
      ))}
    </div>
  );
}
