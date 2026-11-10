import { translate, type Lang } from '../i18n';
import { fmtDay, num } from './format';
import type { CustomerRef, Debt } from '../types/api';

/** Tanlangan mijoz: mavjud (id) yoki yangi (ism + telefon). */
export interface CustomerChoice { id?: number; name: string; phone: string }

export const toCustomerRef = (c: CustomerChoice): CustomerRef =>
  c.id ? { customer_id: c.id } : { customer_name: c.name.trim(), customer_phone: c.phone.trim() || undefined };

export const isCustomerChosen = (c: CustomerChoice) => !!c.id || c.name.trim().length > 0;

/** Mijozga yuboriladigan eslatma matni (tanlangan tilda). */
export function buildReminder(lang: Lang, d: Debt, shop: string) {
  const due = d.due_date
    ? translate(lang, d.status === 'overdue' ? 'rm.dueWas' : 'rm.due', { d: fmtDay(d.due_date) })
    : '';
  return translate(lang, 'rm.msg', { name: d.customer.name, shop, desc: d.description, rest: num(d.remaining), due });
}
