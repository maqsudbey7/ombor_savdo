import type { ReactNode } from 'react';
import { useWarehouse } from '../../hooks/queries';
import { COLORS } from '../../lib/format';
import { useWid } from './useWid';

/** Ombor ichidagi sahifalar sarlavhasi: ombor nomi + sahifa nomi + amallar. */
export default function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const { data: wh } = useWarehouse(useWid());
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          {wh && <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${COLORS[wh.color].grad}`} />}
          <span className="truncate">{wh?.name ?? '…'}</span>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
