import { useState } from 'react';
import { useDeleteDebt, useUndoPayment } from '../hooks/queries';
import { useT } from '../i18n';
import type { Debt } from '../types/api';
import { DebtModal, PaymentModal, RemindModal } from './DebtDialogs';

/** Sahifalar uchun: to'lov, eslatma, tahrirlash, o'chirish oynalarini boshqaradi. */
export function useDebtActions(wid: number) {
  const t = useT();
  const [paying, setPaying] = useState<Debt | null>(null);
  const [reminding, setReminding] = useState<Debt | null>(null);
  const [editing, setEditing] = useState<Debt | null>(null);
  const del = useDeleteDebt(wid);
  const undo = useUndoPayment(wid);
  return {
    handlers: {
      onPay: setPaying, onRemind: setReminding, onEdit: setEditing,
      onDelete: (d: Debt) => { if (confirm(t('dm.confirmDelete'))) del.mutate(d.id); },
      onUndo: (d: Debt, paymentId: number) => { if (confirm(t('cd.confirmUndo'))) undo.mutate({ id: d.id, paymentId }); },
    },
    dialogs: (shop: string) => (
      <>
        <PaymentModal wid={wid} debt={paying} onClose={() => setPaying(null)} />
        <RemindModal wid={wid} debt={reminding} shop={shop} onClose={() => setReminding(null)} />
        <DebtModal wid={wid} open={!!editing} debt={editing ?? undefined} onClose={() => setEditing(null)} />
      </>
    ),
  };
}
