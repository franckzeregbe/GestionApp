export interface Transaction {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  currency: CurrencyId   // devise dans laquelle le montant a été saisi
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
