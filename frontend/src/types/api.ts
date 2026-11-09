// Backend Pydantic sxemalariga mos TypeScript interfeyslari

export type Role = 'customer' | 'admin';
export type OrderStatus = 'new' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type SortBy = 'recommended' | 'price_asc' | 'price_desc' | 'new' | 'name';

export interface User {
  id: number;
  name: string;
  phone: string;
  company: string | null;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface RegisterPayload { name: string; phone: string; company?: string; password: string }
export interface LoginPayload { phone: string; password: string }

export interface CategoryBrief { id: number; name: string; slug: string; icon: string }
export interface Category extends CategoryBrief { product_count: number }

export interface PriceTier { min_qty: number; price: number }

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  category_id: number | null;
  category: CategoryBrief | null;
  image_url: string | null;
  unit: string;
  pack_size: number;
  stock: number;
  moq: number;
  base_price: number;
  is_active: boolean;
  tiers: PriceTier[];
  created_at: string;
}

export interface ProductPayload {
  name: string;
  sku: string;
  description: string;
  category_id: number | null;
  image_url: string | null;
  unit: string;
  pack_size: number;
  stock: number;
  moq: number;
  base_price: number;
  is_active: boolean;
  tiers: PriceTier[];
}

export interface ProductFilters { q?: string; category?: string; sort?: SortBy; in_stock?: boolean }

export interface OrderItem { id: number; product_id: number | null; name: string; unit: string; qty: number; unit_price: number }

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  address: string;
  note: string | null;
  payment_method: PaymentMethod;
  created_at: string;
  items: OrderItem[];
}

export interface AdminOrder extends Order { user: User }

export interface OrderPayload {
  items: { product_id: number; qty: number }[];
  address: string;
  note?: string;
  payment_method: PaymentMethod;
}

export interface Stats {
  revenue: number;
  orders: number;
  new_orders: number;
  customers: number;
  products: number;
  low_stock: { id: number; name: string; stock: number; unit: string; moq: number }[];
  daily: { day: string; total: number; count: number }[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  company: string | null;
  created_at: string;
  orders: number;
  spent: number;
}
