import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, movementsApi, productsApi, warehousesApi } from '../api/endpoints';
import type { CategoryPayload, MovementFilters, MovementPayload, ProductFilters, ProductPayload, WarehousePayload } from '../types/api';
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
};

// ---------- O'qish ----------
export const useWarehouses = () => useQuery({ queryKey: keys.warehouses, queryFn: warehousesApi.list });
export const useWarehouse = (wid: number) => useQuery({ queryKey: keys.info(wid), queryFn: () => warehousesApi.get(wid) });
export const useDashboard = (wid: number) => useQuery({ queryKey: keys.dashboard(wid), queryFn: () => warehousesApi.dashboard(wid) });
export const useCategories = (wid: number) => useQuery({ queryKey: keys.categories(wid), queryFn: () => categoriesApi.list(wid) });
export const useProducts = (wid: number, f: ProductFilters = {}) =>
  useQuery({ queryKey: keys.products(wid, f), queryFn: () => productsApi.list(wid, f), placeholderData: (prev) => prev });
export const useMovements = (wid: number, f: MovementFilters = {}) =>
  useQuery({ queryKey: keys.movements(wid, f), queryFn: () => movementsApi.list(wid, f), placeholderData: (prev) => prev });

// ---------- O'zgartirish ----------
/** Ombor ichida biror narsa o'zgarsa — shu omborning barcha keshlari va omborlar ro'yxati yangilanadi. */
function useWarehouseMutation<TVars, TRes>(wid: number, fn: (v: TVars) => Promise<TRes>, success?: string) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.wh(wid) });
      qc.invalidateQueries({ queryKey: keys.warehouses });
      if (success) dispatch(toast(success));
    },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: warehousesApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: keys.warehouses }) });
}
export const useUpdateWarehouse = (wid: number) =>
  useWarehouseMutation(wid, (d: WarehousePayload) => warehousesApi.update(wid, d), 'Ombor saqlandi');
export function useDeleteWarehouse() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: warehousesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.warehouses }); dispatch(toast('Ombor o‘chirildi')); },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
}

export const useSaveCategory = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id?: number; data: CategoryPayload }) =>
    id ? categoriesApi.update(wid, id, data) : categoriesApi.create(wid, data), 'Kategoriya saqlandi');
export const useDeleteCategory = (wid: number) =>
  useWarehouseMutation(wid, (id: number) => categoriesApi.remove(wid, id), 'Kategoriya o‘chirildi');

export const useSaveProduct = (wid: number) =>
  useWarehouseMutation(wid, ({ id, data }: { id?: number; data: ProductPayload }) =>
    id ? productsApi.update(wid, id, data) : productsApi.create(wid, data), 'Mahsulot saqlandi');
export const useDeleteProduct = (wid: number) =>
  useWarehouseMutation(wid, (id: number) => productsApi.remove(wid, id), 'Mahsulot o‘chirildi');

export const useCreateMovement = (wid: number) =>
  useWarehouseMutation(wid, (d: MovementPayload) => movementsApi.create(wid, d));
