import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, catalogApi, ordersApi } from '../api/endpoints';
import type { OrderStatus, ProductFilters, ProductPayload } from '../types/api';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';

export const keys = {
  categories: ['categories'] as const,
  products: (f: ProductFilters) => ['products', f] as const,
  product: (id: number) => ['product', id] as const,
  myOrders: ['orders', 'my'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminProducts: ['admin', 'products'] as const,
  adminOrders: (s?: OrderStatus) => ['admin', 'orders', s ?? 'all'] as const,
  adminCustomers: ['admin', 'customers'] as const,
};

// ---------- Katalog ----------
export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: catalogApi.categories, staleTime: 60_000 });
export const useProducts = (f: ProductFilters) => useQuery({ queryKey: keys.products(f), queryFn: () => catalogApi.products(f) });
export const useProduct = (id: number) => useQuery({ queryKey: keys.product(id), queryFn: () => catalogApi.product(id), enabled: id > 0 });

// ---------- Buyurtmalar ----------
export const useMyOrders = (enabled: boolean) => useQuery({ queryKey: keys.myOrders, queryFn: ordersApi.my, enabled });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

// ---------- Admin ----------
export const useStats = () => useQuery({ queryKey: keys.adminStats, queryFn: adminApi.stats });
export const useAdminProducts = () => useQuery({ queryKey: keys.adminProducts, queryFn: adminApi.products });
export const useAdminOrders = (s?: OrderStatus) => useQuery({ queryKey: keys.adminOrders(s), queryFn: () => adminApi.orders(s) });
export const useCustomers = () => useQuery({ queryKey: keys.adminCustomers, queryFn: adminApi.customers });

/** Katalog/ombor o‘zgarganda tegishli keshlarni yangilash. */
function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    for (const k of [['admin'], ['products'], ['product'], ['categories']]) qc.invalidateQueries({ queryKey: k });
  };
}

function useErrorToast() {
  const dispatch = useAppDispatch();
  return (e: Error) => dispatch(toast(e.message, 'err'));
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ProductPayload }) =>
      id ? adminApi.updateProduct(id, data) : adminApi.createProduct(data),
    onSuccess: invalidate,
  });
}

export function usePatchStock() {
  const invalidate = useInvalidateCatalog();
  const onError = useErrorToast();
  return useMutation({ mutationFn: ({ id, delta }: { id: number; delta: number }) => adminApi.patchStock(id, delta), onSuccess: invalidate, onError });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog();
  const onError = useErrorToast();
  return useMutation({ mutationFn: adminApi.deleteProduct, onSuccess: invalidate, onError });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCatalog();
  const onError = useErrorToast();
  return useMutation({ mutationFn: adminApi.createCategory, onSuccess: invalidate, onError });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCatalog();
  const onError = useErrorToast();
  return useMutation({ mutationFn: adminApi.deleteCategory, onSuccess: invalidate, onError });
}

export function useSetOrderStatus() {
  const invalidate = useInvalidateCatalog();
  const onError = useErrorToast();
  return useMutation({ mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => adminApi.setOrderStatus(id, status), onSuccess: invalidate, onError });
}
