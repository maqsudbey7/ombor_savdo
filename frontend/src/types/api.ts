// Backend Pydantic sxemalariga mos TypeScript interfeyslari

export type Color = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'orange' | 'slate';
export type MovementType = 'in' | 'out' | 'adjust';
export type StockFilter = 'all' | 'low' | 'out';
export type ProductSort = 'name' | 'new' | 'qty_asc' | 'qty_desc' | 'value_desc';

export interface User { id: number; name: string; phone: string }
export interface TokenResponse { access_token: string; token_type: 'bearer'; user: User }
export interface RegisterPayload { name: string; phone: string; password: string }
export interface LoginPayload { phone: string; password: string }

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  description: string;
  color: Color;
  created_at: string;
}
export interface WarehouseSummary extends Warehouse {
  product_count: number;
  total_quantity: number;
  stock_value: number;
  low_stock_count: number;
  last_movement_at: string | null;
}
export interface WarehousePayload {
  name: string;
  address: string;
  description: string;
  color: Color;
  with_sample?: boolean;
}

export interface Category { id: number; name: string; color: Color; product_count: number }
export interface CategoryPayload { name: string; color: Color }

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number | null;
  category: { id: number; name: string; color: Color } | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  min_quantity: number;
  location: string;
  description: string;
  created_at: string;
  updated_at: string;
}
export interface ProductPayload {
  name: string;
  sku: string;
  category_id: number | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  min_quantity: number;
  location: string;
  description: string;
  initial_quantity?: number;
}
export interface ProductFilters { q?: string; category_id?: number; stock?: StockFilter; sort?: ProductSort }

export interface Movement {
  id: number;
  product_id: number | null;
  type: MovementType;
  product_name: string;
  unit: string;
  quantity: number;
  delta: number;
  balance_after: number;
  price: number;
  counterparty: string;
  note: string;
  created_at: string;
  debt_id: number | null;
}
export interface MovementPayload {
  product_id: number;
  type: MovementType;
  quantity: number;
  price?: number;
  counterparty: string;
  note: string;
  /** Faqat chiqimda: qarzga berildi */
  debt?: CustomerRef & { due_date: string | null };
}
export interface MovementFilters { type?: MovementType; product_id?: number; limit?: number }

export interface Dashboard {
  product_count: number;
  total_quantity: number;
  stock_value: number;
  potential_revenue: number;
  low_stock_count: number;
  out_of_stock_count: number;
  month_in_value: number;
  month_out_value: number;
  daily: { day: string; in_qty: number; out_qty: number; in_value: number; out_value: number }[];
  low_stock: { id: number; name: string; sku: string; unit: string; quantity: number; min_quantity: number }[];
  categories: { name: string; color: Color; product_count: number; stock_value: number }[];
  recent: Movement[];
}

// ---------- Qarzdorlik ----------
export type DebtStatus = 'paid' | 'overdue' | 'due_today' | 'due_soon' | 'open';
export type DebtFilter = 'open' | 'overdue' | 'soon' | 'paid' | 'all';

/** Mavjud mijoz (customer_id) yoki yangi mijoz (ism + telefon). */
export interface CustomerRef { customer_id?: number; customer_name?: string; customer_phone?: string }

export interface CustomerBrief { id: number; name: string; phone: string }
export interface Customer extends CustomerBrief {
  note: string;
  created_at: string;
  total: number;
  paid: number;
  remaining: number;
  open_count: number;
  overdue_count: number;
  next_due: string | null;
}
export interface CustomerPayload { name: string; phone: string; note: string }

export interface DebtPayment { id: number; amount: number; note: string; paid_at: string }
export interface Debt {
  id: number;
  customer: CustomerBrief;
  description: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  given_date: string;
  due_date: string | null;
  status: DebtStatus;
  days_left: number | null;
  note: string;
  reminded_at: string | null;
  movement_id: number | null;
  created_at: string;
  payments: DebtPayment[];
}
export interface DebtPayload extends CustomerRef {
  description: string;
  amount: number;
  given_date: string;
  due_date: string | null;
  note: string;
}
export interface DebtSummary {
  outstanding: number;
  overdue_amount: number;
  overdue_count: number;
  due_today_count: number;
  due_soon_count: number;
  debtors_count: number;
  collected_30d: number;
}
export interface Notification {
  kind: 'overdue' | 'due_today' | 'due_soon';
  warehouse_id: number;
  warehouse_name: string;
  debt_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  description: string;
  remaining: number;
  due_date: string;
  days_left: number;
}
