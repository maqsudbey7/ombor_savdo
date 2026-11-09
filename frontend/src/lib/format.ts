import type { OrderStatus, PaymentMethod } from '../types/api';

export const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)).replace(/[\s\u00a0\u202f]/g, ' ') + " so'm";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: 'Yangi', cls: 'bg-brand-50 text-brand-700' },
  confirmed: { label: 'Tasdiqlandi', cls: 'bg-violet-50 text-violet-700' },
  shipping: { label: 'Yo‘lda', cls: 'bg-amber-50 text-amber-700' },
  delivered: { label: 'Yetkazildi', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Bekor qilindi', cls: 'bg-rose-50 text-rose-700' },
};

export const PAYMENT: Record<PaymentMethod, string> = {
  cash: 'Naqd pul',
  transfer: 'Pul o‘tkazish (hisob raqam)',
  card: 'Plastik karta',
};
