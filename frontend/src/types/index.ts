export interface User {
  id: number
  company_id: number | null
  name: string
  email: string
  phone: string | null
  is_active: boolean
  roles?: { id: number; name: string }[]
}

export interface Company {
  id: number
  name: string
  legal_name: string | null
  tax_number: string | null
  email: string | null
  phone: string | null
  currency: string
  country: string
  status: 'active' | 'suspended' | 'trial'
  plan?: Plan
}

export interface Plan {
  id: number
  name: string
  name_ar: string | null
  price: string
  billing_cycle: 'monthly' | 'yearly'
  max_users: number | null
  max_invoices_per_month: number | null
  is_active: boolean
}

export interface Account {
  id: number
  code: string
  name: string
  name_ar: string | null
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normal_balance: 'debit' | 'credit'
  is_active: boolean
  is_system: boolean
  parent_id: number | null
}

export interface Customer {
  id: number
  code: string | null
  name: string
  type: 'individual' | 'company'
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  opening_balance: string
}

export interface Supplier {
  id: number
  code: string | null
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
}

export interface Product {
  id: number
  sku: string | null
  name: string
  type: 'product' | 'service'
  sale_price: string
  cost_price: string
  tax_rate: string
  track_inventory: boolean
  quantity_on_hand: string
  reorder_level: string | null
  is_active: boolean
}

export interface InvoiceItem {
  id?: number
  product_id: number | null
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount: number
  line_total?: string
}

export interface Invoice {
  id: number
  type: 'sales' | 'purchase'
  invoice_number: string
  customer_id: number | null
  supplier_id: number | null
  customer?: Customer
  supplier?: Supplier
  issue_date: string
  due_date: string | null
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'void'
  subtotal: string
  discount_total: string
  tax_total: string
  total: string
  paid_amount: string
  zatca_qr_code: string | null
  items?: InvoiceItem[]
}

export interface BankAccount {
  id: number
  account_name: string
  bank_name: string
  account_number: string | null
  iban: string | null
  currency: string
  is_active: boolean
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}
