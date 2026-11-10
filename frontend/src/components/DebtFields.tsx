import { useMemo, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useCustomers } from '../hooks/queries';
import { useT } from '../i18n';
import { isoDay, money } from '../lib/format';
import type { CustomerChoice } from '../lib/debts';

/** Mijozni ro'yxatdan topish yoki yangisini kiritish. */
export function CustomerPicker({ wid, value, onChange }: { wid: number; value: CustomerChoice; onChange: (c: CustomerChoice) => void }) {
  const t = useT();
  const { data: customers = [] } = useCustomers(wid);
  const [focus, setFocus] = useState(false);
  const q = value.name.trim().toLowerCase();
  const matches = useMemo(
    () => customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\s/g, ''))).slice(0, 6),
    [customers, q],
  );
  const exact = customers.some((c) => c.name.toLowerCase() === q);

  if (value.id) {
    const c = customers.find((x) => x.id === value.id);
    return (
      <div>
        <span className="label">{t('cp.label')}</span>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-200">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{value.name}</div>
            <div className="text-xs text-slate-500">{value.phone || '—'}{c && c.remaining > 0 && ` · ${t('cp.debt', { v: money(c.remaining) })}`}</div>
          </div>
          <button type="button" className="icon-btn h-8 w-8" aria-label={t('common.change')} onClick={() => onChange({ name: '', phone: '' })}><X size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="label">{t('cp.label')}</span>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={t('cp.searchPh')} value={value.name} autoComplete="off"
            onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            onChange={(e) => onChange({ name: e.target.value, phone: value.phone })} />
        </div>
        {focus && (matches.length > 0 || (q && !exact)) && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
            {matches.map((c) => (
              <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ id: c.id, name: c.name, phone: c.phone }); setFocus(false); }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50">
                <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="text-xs text-slate-400">{c.phone || '—'}</span></span>
                {c.remaining > 0 && <span className="shrink-0 text-xs font-semibold text-rose-600">{money(c.remaining)}</span>}
              </button>
            ))}
            {q && !exact && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-700">
                <UserPlus size={16} /> {t('cp.new', { name: value.name.trim() })}
              </div>
            )}
          </div>
        )}
        {!q && <span className="mt-1 block text-xs text-slate-400">{t('cp.newHint')}</span>}
      </div>
      {q && !exact && (
        <label className="block">
          <span className="label">{t('cp.phone')}</span>
          <input type="tel" className="input" placeholder="+998 90 123 45 67" value={value.phone} onChange={(e) => onChange({ name: value.name, phone: e.target.value })} />
        </label>
      )}
    </div>
  );
}

const PRESETS = [{ key: 'due.week', days: 7 }, { key: 'due.2weeks', days: 14 }, { key: 'due.month', days: 30 }] as const;

/** Qaytarish muddati: tezkor tugmalar + sana. Bo'sh qiymat — muddatsiz. */
export function DuePicker({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) {
  const t = useT();
  return (
    <div>
      <span className="label">{t('due.label')}</span>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const d = isoDay(p.days);
          return (
            <button key={p.key} type="button" onClick={() => onChange(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === d ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t(p.key)}
            </button>
          );
        })}
        <button type="button" onClick={() => onChange('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {t('due.none')}
        </button>
      </div>
      <input type="date" className="input" value={value} min={min ?? isoDay()} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
