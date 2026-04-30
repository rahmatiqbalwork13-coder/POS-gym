export type Role = 'admin' | 'ketua' | 'staff'

export interface Profile {
  id: string
  full_name: string | null
  role: Role
}

export interface Item {
  id: string
  name: string
  purchase_price: number
  selling_price: number
  stock: number
  created_at: string
}

export interface ItemPublic {
  id: string
  name: string
  selling_price: number
  stock: number
}

export interface CartItem {
  item: ItemPublic
  qty: number
}

export interface Transaction {
  id: string
  cashier_id: string
  total_amount: number
  total_laba_kotor: number
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  item_id: string
  qty: number
  purchase_price_at_time: number
  selling_price_at_time: number
  laba_kotor_line: number
}

export interface ProfitDistribution {
  id: string
  transaction_id: string
  laba_kotor_total: number
  shu_50: number
  dana_30: number
  opr_20: number
  created_at: string
}

export interface ProfitSummary {
  laba_kotor_total: number
  shu_50: number
  dana_30: number
  opr_20: number
}

export interface SessionUser {
  id: string
  email: string
  role: Role
  full_name: string | null
}
