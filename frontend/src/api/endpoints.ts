import { download, qs, request } from './client';
import type {
  Category, CategoryPayload, Dashboard, LoginPayload, Movement, MovementFilters, MovementPayload, Product,
  ProductFilters, ProductPayload, RegisterPayload, TokenResponse, User, Warehouse, WarehousePayload, WarehouseSummary,
} from '../types/api';

export const authApi = {
  login: (data: LoginPayload) => request<TokenResponse>('/auth/login', 'POST', data),
  register: (data: RegisterPayload) => request<TokenResponse>('/auth/register', 'POST', data),
  me: () => request<User>('/auth/me'),
};

export const warehousesApi = {
  list: () => request<WarehouseSummary[]>('/warehouses'),
  get: (id: number) => request<Warehouse>(`/warehouses/${id}`),
  create: (data: WarehousePayload) => request<Warehouse>('/warehouses', 'POST', data),
  update: (id: number, data: WarehousePayload) => request<Warehouse>(`/warehouses/${id}`, 'PUT', data),
  remove: (id: number) => request<void>(`/warehouses/${id}`, 'DELETE'),
  dashboard: (id: number) => request<Dashboard>(`/warehouses/${id}/dashboard`),
};

export const categoriesApi = {
  list: (wid: number) => request<Category[]>(`/warehouses/${wid}/categories`),
  create: (wid: number, data: CategoryPayload) => request<Category>(`/warehouses/${wid}/categories`, 'POST', data),
  update: (wid: number, id: number, data: CategoryPayload) => request<Category>(`/warehouses/${wid}/categories/${id}`, 'PUT', data),
  remove: (wid: number, id: number) => request<void>(`/warehouses/${wid}/categories/${id}`, 'DELETE'),
};

export const productsApi = {
  list: (wid: number, f: ProductFilters = {}) => request<Product[]>(`/warehouses/${wid}/products${qs({ ...f })}`),
  create: (wid: number, data: ProductPayload) => request<Product>(`/warehouses/${wid}/products`, 'POST', data),
  update: (wid: number, id: number, data: ProductPayload) => request<Product>(`/warehouses/${wid}/products/${id}`, 'PUT', data),
  remove: (wid: number, id: number) => request<void>(`/warehouses/${wid}/products/${id}`, 'DELETE'),
  exportCsv: (wid: number, name: string) => download(`/warehouses/${wid}/products/export`, `${name.replace(/[\\/:*?"<>|]/g, '')} - qoldiq.csv`),
};

export const movementsApi = {
  list: (wid: number, f: MovementFilters = {}) => request<Movement[]>(`/warehouses/${wid}/movements${qs({ ...f })}`),
  create: (wid: number, data: MovementPayload) => request<Movement>(`/warehouses/${wid}/movements`, 'POST', data),
};
