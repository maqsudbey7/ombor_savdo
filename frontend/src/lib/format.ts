import type { Color, MovementType } from '../types/api';

const nf = new Intl.NumberFormat('ru-RU');
const clean = (s: string) => s.replace(/\s/g, ' ');

export const num = (n: number) => clean(nf.format(Math.round(n || 0)));
export const money = (n: number) => `${num(n)} so'm`;

/** Katta summalarni qisqa ko‘rsatish: 12.6 mln, 1.2 mlrd */
export function moneyShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1).replace('.0', '')} mlrd`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace('.0', '')} mln`;
  if (a >= 1e4) return `${Math.round(n / 1e3)} ming`;
  return num(n);
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'hozirgina';
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} kun oldin`;
  return fmtDate(iso).slice(0, 10);
}

export const MOVEMENT: Record<MovementType, { label: string; short: string; cls: string; dot: string }> = {
  in: { label: 'Kirim', short: '+', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  out: { label: 'Chiqim', short: '−', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  adjust: { label: 'Inventarizatsiya', short: '=', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
};

/** Tailwind klasslari to‘liq yozilgan bo‘lishi kerak (JIT ularni shu fayldan topadi). */
export const COLORS: Record<Color, { label: string; dot: string; soft: string; grad: string; text: string; bar: string }> = {
  blue: { label: 'Ko‘k', dot: 'bg-blue-500', soft: 'bg-blue-50 text-blue-700', grad: 'from-blue-500 to-indigo-600', text: 'text-blue-600', bar: 'bg-blue-500' },
  emerald: { label: 'Yashil', dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', grad: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { label: 'Sariq', dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700', grad: 'from-amber-400 to-orange-500', text: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { label: 'Qizil', dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', grad: 'from-rose-500 to-pink-600', text: 'text-rose-600', bar: 'bg-rose-500' },
  violet: { label: 'Binafsha', dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', grad: 'from-violet-500 to-purple-600', text: 'text-violet-600', bar: 'bg-violet-500' },
  cyan: { label: 'Moviy', dot: 'bg-cyan-500', soft: 'bg-cyan-50 text-cyan-700', grad: 'from-cyan-400 to-sky-600', text: 'text-cyan-600', bar: 'bg-cyan-500' },
  orange: { label: 'To‘q sariq', dot: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700', grad: 'from-orange-400 to-red-500', text: 'text-orange-600', bar: 'bg-orange-500' },
  slate: { label: 'Kulrang', dot: 'bg-slate-500', soft: 'bg-slate-100 text-slate-700', grad: 'from-slate-500 to-slate-700', text: 'text-slate-600', bar: 'bg-slate-400' },
};
export const COLOR_KEYS = Object.keys(COLORS) as Color[];

export const UNITS = ['dona', 'quti', 'qop', 'blok', 'kg', 'litr', 'metr', 'list', 'buxta', 'paket'];
