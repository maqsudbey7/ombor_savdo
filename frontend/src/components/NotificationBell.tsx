import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';
import { money } from '../lib/format';
import type { Notification } from '../types/api';

const KIND_STYLE: Record<Notification['kind'], string> = {
  overdue: 'bg-rose-50 text-rose-700',
  due_today: 'bg-amber-50 text-amber-700',
  due_soon: 'bg-sky-50 text-sky-700',
};

/** Muddati kelgan / o'tgan qarzlar uchun qo'ng'iroqcha. `align` — panel qaysi tomonga ochiladi. */
export default function NotificationBell({ dark = false, align = 'left' }: { dark?: boolean; align?: 'left' | 'right' }) {
  const t = useT();
  const { data = [] } = useNotifications();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const urgent = data.filter((n) => n.kind !== 'due_soon').length;

  // Kuniga bir marta: muddati kelgan qarzlar haqida toast
  useEffect(() => {
    if (!urgent) return;
    const key = `notified-${new Date().toDateString()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* storage yo'q */ }
    dispatch(toast(t('notif.toast', { n: urgent }), 'err'));
  }, [urgent, dispatch, t]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const label = (n: Notification) =>
    n.kind === 'overdue' ? t('notif.overdue', { n: -n.days_left }) : n.kind === 'due_today' ? t('notif.today') : t('notif.soon', { n: n.days_left });

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label={t('notif.title')}
        className={`relative grid h-9 w-9 place-items-center rounded-lg transition ${dark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
        <Bell size={19} className={urgent ? 'origin-top animate-[wiggle_1.2s_ease-in-out_2]' : ''} />
        {data.length > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white ${urgent ? 'bg-rose-500' : 'bg-sky-500'}`}>
            {data.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full z-[60] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl ring-1 ring-slate-200 ${align === 'left' ? 'left-0' : 'right-0'}`}>
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold">{t('notif.title')}</div>
            <div className="max-h-96 overflow-y-auto">
              {!data.length && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-slate-500">
                  <CheckCircle2 className="text-emerald-500" /> {t('notif.empty')}
                </div>
              )}
              {data.map((n) => (
                <Link key={n.debt_id} to={`/omborlar/${n.warehouse_id}/qarzdorlar?customer=${n.customer_id}`} onClick={() => setOpen(false)}
                  className="block border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{n.customer_name}</div>
                      <div className="truncate text-xs text-slate-500">{n.description}</div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-bold tabular-nums">{money(n.remaining)}</div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className={`badge ${KIND_STYLE[n.kind]}`}>{label(n)}</span>
                    <span className="truncate text-[11px] text-slate-400">{n.warehouse_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
