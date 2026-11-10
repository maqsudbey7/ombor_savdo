import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, customersApi, debtsApi, movementsApi, notificationsApi, productsApi, warehousesApi } from '../api/endpoints';
import type { CategoryPayload, CustomerPayload, DebtFilter, DebtPayload, MovementFilters, MovementPayload, ProductFilters, ProductPayload, WarehousePayload } from '../types/api';
import { translate, type TKey } from '../i18n';
import { store } from '../store';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';

export const keys = {
  warehouses: ['warehouses'] as const,
  wh: (wid: number) => ['wh', wid] as const,
  info: (wid: number) => ['wh', wid, 'info'] as const,
  dashboard: (wid: number) => ['wh', wid, 'dashboard'] as const,
  categories: (wid: number) => ['wh', wid, 'categories'] as const,
  products: (wid: number, f: ProductFilters) => ['wh', wid, 'products', f] as const,
  movements: (wid: number, f: MovementFilters) => ['wh', wid, 'movements', f] as const,
  customers: (wid: number, q?: string) => ['wh', wid, 'customers', q ?? ''] as const,
  debts: (wid: number, f: object) => ['wh', wid, 'debts', f] as const,
  debtSummary: (wid: number) => ['wh', wid, 'debt-summary'] as const,
  notifications: ['notifications'] as const,
};
const tr = (k: TKey) => translate(store.getState().ui.lang, k);

// ---------- O'qish ----------
export const useWarehouses = () => useQuery({ queryKey: keys.warehouses, queryFn: warehousesApi.list });
export const useWarehouse = (wid: number) => useQuery({ queryKey: keys.info(wid), queryFn: () => warehousesApi.get(wid) });
export const useDashboard = (wid: number) => useQuery({ queryKey: keys.dashboard(wid), queryFn: () => warehousesApi.dashboard(wid) });
export const useCategories = (wid: number) => useQuery({ queryKey: keys.categories(wid), queryFn: () => categoriesApi.list(wid) });
export const useProducts = (wid: number, f: ProductFilters = {}) =>
  useQuery({ queryKey: keys.products(wid, f), queryFn: () => productsApi.list(wid, f), placeholderData: (prev) => prev });
export const useMovements = (wid: number, f: MovementFilters = {}) =>
  useQuery({ queryKey: keys.movements(wid, f), queryFn: () => movementsApi.list(wid, f), placeholderData: (prev) => prev });
export const useCustomers = (wid: number, q?: string) =>
  useQuery({ queryKey: keys.customers(wid, q), queryFn: () => customersApi.list(wid, q || undefined), placeholderData: (prev) => prev });
export const useDebts = (wid: number, f: { filter?: DebtFilter; customer_id?: number; q?: string } = {}) =>
  useQuery({ queryKey: keys.debts(wid, f), queryFn: () => debtsApi.list(wid, f), placeholderData: (prev) => prev });
export const useDebtSummary = (wid: number) => useQuery({ queryKey: keys.debtSummary(wid), queryFn: () => debtsApi.summary(wid) });
/** Har 5 daqiqada yangilanadi — muddati kelgan qarzlar uchun qo'ng'iroqcha. */
export const useNotifications = (enabled = true) =>
  useQuery({ queryKey: keys.notifications, queryFn: notificationsApi.list, enabled, refetchInterval: 5 * 60_000, staleTime: 60_000 });

// ---------- O'zgartirish ----------
/** Ombor ichida biror narsa o'zgarsa — shu omborning barcha keshlari va omborlar ro'yxati yangilanadi. */
function useWarehouseMutation<TVars, TRes>(wid: number, fn: (v: TVars) => Promise<TRes>, success?: TKey) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.wh(wid) });
      qc.invalidateQueries({ queryKey: keys.warehouses });
      qc.invalidateQueries({ queryKey: keys.notifications });
      if (success) dispatch(toast(tr(success)));
    },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: warehousesApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: keys.warehouses }) });
}
export const useUpdateWarehouse = (wid: number) =>
  useWarehouseMutation(wid, (d: WarehousePayload) => warehousesApi.update(wid, d), 'whm.saved');
export function useDeleteWarehouse() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: warehousesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.warehouses }); dispatch(toast(tr('whm.deleted'))); },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
}

export const useSaveCategory = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id?: number; data: CategoryPayload }) =>
    id ? categoriesApi.update(wid, id, data) : categoriesApi.create(wid, data), 'cat.saved');
export const useDeleteCategory = (wid: number) =>
  useWarehouseMutation(wid, (id: number) => categoriesApi.remove(wid, id), 'cat.deleted');

export const useSaveProduct = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id?: number; data: ProductPayload }) =>
    id ? productsApi.update(wid, id, data) : productsApi.create(wid, data), 'prod.saved');
export const useDeleteProduct = (wid: number) =>
  useWarehouseMutation(wid, (id: number) => productsApi.remove(wid, id), 'prod.deleted');

export const useCreateMovement = (wid: number) =>
  useWarehouseMutation(wid, (d: MovementPayload) => movementsApi.create(wid, d));

// ---------- Qarzdorlik ----------
export const useSaveDebt = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id?: number; data: DebtPayload }) =>
    id ? debtsApi.update(wid, id, data) : debtsApi.create(wid, data));
export const useDeleteDebt = (wid: number) => useWarehouseMutation(wid, (id: number) => debtsApi.remove(wid, id), 'dm.deleted');
export const usePayDebt = (wid: number) =>
  useWarehouseMutation(wid, ({ id, amount, note }: { id: number; amount: number; note: string }) => debtsApi.pay(wid, id, { amount, note }));
export const useUndoPayment = (wid: number) =>
  useWarehouseMutation(wid, ({ id, paymentId }: { id: number; paymentId: number }) => debtsApi.undoPayment(wid, id, paymentId));
export const useRemind = (wid: number) => useWarehouseMutation(wid, (id: number) => debtsApi.remind(wid, id));
export const useSaveCustomer = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id: number; data: CustomerPayload }) => customersApi.update(wid, id, data), 'cd.saved');
export const useDeleteCustomer = (wid: number) =>
  useWarehouseMutation(wid, (id: number) => customersApi.remove(wid, id), 'cd.deleted');
