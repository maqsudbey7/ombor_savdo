import type { Color, MovementType } from '../types/api';
import { store } from '../store';
import { dateLocale, translate, type TKey } from '../i18n';

// Joriy til (formatlash funksiyalari komponentdan tashqarida ham ishlashi uchun store'dan o'qiladi)
const lang = () => store.getState().ui.lang;
const tt = (key: TKey, vars?: Record<string, string | number>) => translate(lang(), key, vars);

const nf = new Intl.NumberFormat('ru-RU');
const clean = (s: string) => s.replace(/\s/g, ' ');

export const num = (n: number) => clean(nf.format(Math.round(n || 0)));
export const money = (n: number) => `${num(n)} ${tt('common.currency')}`;

/** Katta summalarni qisqa ko‘rsatish: 12.6 mln, 1.2 mlrd */
export function moneyShort(n: number): string {
  const a = Math.abs(n);
  const d = (x: number) => x.toFixed(1).replace('.0', '').replace('.', lang() === 'ru' ? ',' : '.');
  if (a >= 1e9) return `${d(n / 1e9)} ${tt('fmt.bln')}`;
  if (a >= 1e6) return `${d(n / 1e6)} ${tt('fmt.mln')}`;
  if (a >= 1e4) return `${Math.round(n / 1e3)} ${tt('fmt.k')}`;
  return num(n);
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "2026-11-10" kabi sanani o'qiladigan ko'rinishda: 10.11.2026 */
export const fmtDay = (d: string) => d.split('-').reverse().join('.');

/** 10-noyabr / 10 ноября */
export const fmtDayLong = (d: string | Date, withYear = false) =>
  new Date(typeof d === 'string' && d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(dateLocale(lang()), {
    day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}),
  });

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return tt('time.now');
  if (s < 3600) return tt('time.min', { n: Math.floor(s / 60) });
  if (s < 86400) return tt('time.hour', { n: Math.floor(s / 3600) });
  if (s < 86400 * 7) return tt('time.day', { n: Math.floor(s / 86400) });
  return fmtDate(iso).slice(0, 10);
}

/** Bugungi sana (mahalliy) YYYY-MM-DD ko'rinishida; offset — kun qo'shish. */
export function isoDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MOVEMENT_STYLE: Record<MovementType, { cls: string; dot: string }> = {
  in: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  out: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  adjust: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
};

/** Tailwind klasslari to‘liq yozilgan bo‘lishi kerak (JIT ularni shu fayldan topadi). */
export const COLORS: Record<Color, { dot: string; soft: string; grad: string; text: string; bar: string }> = {
  blue: { dot: 'bg-blue-500', soft: 'bg-blue-50 text-blue-700', grad: 'from-blue-500 to-indigo-600', text: 'text-blue-600', bar: 'bg-blue-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', grad: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700', grad: 'from-amber-400 to-orange-500', text: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', grad: 'from-rose-500 to-pink-600', text: 'text-rose-600', bar: 'bg-rose-500' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', grad: 'from-violet-500 to-purple-600', text: 'text-violet-600', bar: 'bg-violet-500' },
  cyan: { dot: 'bg-cyan-500', soft: 'bg-cyan-50 text-cyan-700', grad: 'from-cyan-400 to-sky-600', text: 'text-cyan-600', bar: 'bg-cyan-500' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700', grad: 'from-orange-400 to-red-500', text: 'text-orange-600', bar: 'bg-orange-500' },
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-100 text-slate-700', grad: 'from-slate-500 to-slate-700', text: 'text-slate-600', bar: 'bg-slate-400' },
};
export const COLOR_KEYS = Object.keys(COLORS) as Color[];

export const UNITS = ['dona', 'quti', 'qop', 'blok', 'kg', 'litr', 'metr', 'list', 'buxta', 'paket', 'шт', 'кор.', 'меш.', 'кг', 'л', 'м'];
