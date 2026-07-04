export interface Transaction {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  note: string
}

export interface Budgets {
  [category: string]: number
}

export type CurrencyId = 'cad' | 'usd' | 'fcfa' | 'eur'

export interface AppState {
  transactions: Transaction[]
  budgets: Budgets
}
