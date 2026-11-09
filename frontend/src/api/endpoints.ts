import { qs, request } from './client';
import type {
  AdminOrder, Category, Customer, LoginPayload, Order, OrderPayload, OrderStatus, Product, ProductFilters,
  ProductPayload, RegisterPayload, Stats, TokenResponse, User,
} from '../types/api';

export const authApi = {
  login: (data: LoginPayload) => request<TokenResponse>('/auth/login', 'POST', data),
  register: (data: RegisterPayload) => request<TokenResponse>('/auth/register', 'POST', data),
  me: () => request<User>('/auth/me'),
};

export const catalogApi = {
  categories: () => request<Category[]>('/categories'),
  products: (f: ProductFilters = {}) => request<Product[]>(`/products${qs({ ...f })}`),
  product: (id: number) => request<Product>(`/products/${id}`),
};

export const ordersApi = {
  create: (data: OrderPayload) => request<Order>('/orders', 'POST', data),
  my: () => request<Order[]>('/orders/my'),
};

export const adminApi = {
  stats: () => request<Stats>('/admin/stats'),
  products: () => request<Product[]>('/admin/products'),
  createProduct: (data: ProductPayload) => request<Product>('/admin/products', 'POST', data),
  updateProduct: (id: number, data: ProductPayload) => request<Product>(`/admin/products/${id}`, 'PUT', data),
  patchStock: (id: number, delta: number) => request<Product>(`/admin/products/${id}/stock`, 'PATCH', { delta }),
  deleteProduct: (id: number) => request<void>(`/admin/products/${id}`, 'DELETE'),
  createCategory: (data: { name: string; icon: string }) => request<Category>('/admin/categories', 'POST', data),
  deleteCategory: (id: number) => request<void>(`/admin/categories/${id}`, 'DELETE'),
  orders: (status?: OrderStatus) => request<AdminOrder[]>(`/admin/orders${qs({ status })}`),
  setOrderStatus: (id: number, status: OrderStatus) => request<AdminOrder>(`/admin/orders/${id}`, 'PATCH', { status }),
  customers: () => request<Customer[]>('/admin/customers'),
};
