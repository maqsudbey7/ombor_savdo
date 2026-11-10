import { download, qs, request } from './client';
import type {
  Customer, CustomerPayload, Debt, DebtFilter, DebtPayload, DebtSummary, Notification,
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

export const customersApi = {
  list: (wid: number, q?: string) => request<Customer[]>(`/warehouses/${wid}/customers${qs({ q })}`),
  update: (wid: number, id: number, data: CustomerPayload) => request<Customer>(`/warehouses/${wid}/customers/${id}`, 'PUT', data),
  remove: (wid: number, id: number) => request<void>(`/warehouses/${wid}/customers/${id}`, 'DELETE'),
};

export const debtsApi = {
  summary: (wid: number) => request<DebtSummary>(`/warehouses/${wid}/debts/summary`),
  list: (wid: number, f: { filter?: DebtFilter; customer_id?: number; q?: string } = {}) =>
    request<Debt[]>(`/warehouses/${wid}/debts${qs({ ...f })}`),
  create: (wid: number, data: DebtPayload) => request<Debt>(`/warehouses/${wid}/debts`, 'POST', data),
  update: (wid: number, id: number, data: Omit<DebtPayload, 'customer_id' | 'customer_name' | 'customer_phone'>) =>
    request<Debt>(`/warehouses/${wid}/debts/${id}`, 'PUT', data),
  remove: (wid: number, id: number) => request<void>(`/warehouses/${wid}/debts/${id}`, 'DELETE'),
  pay: (wid: number, id: number, data: { amount: number; note: string }) => request<Debt>(`/warehouses/${wid}/debts/${id}/payments`, 'POST', data),
  undoPayment: (wid: number, id: number, paymentId: number) => request<Debt>(`/warehouses/${wid}/debts/${id}/payments/${paymentId}`, 'DELETE'),
  remind: (wid: number, id: number) => request<Debt>(`/warehouses/${wid}/debts/${id}/remind`, 'POST'),
};

export const notificationsApi = { list: () => request<Notification[]>('/notifications') };
