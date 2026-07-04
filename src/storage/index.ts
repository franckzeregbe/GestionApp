import AsyncStorage from '@react-native-async-storage/async-storage'
import { type Transaction, type Budgets } from '../types'

const KEYS = {
  transactions: 'gestion_data',
  budgets: 'gestion_budgets',
}

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const d = await AsyncStorage.getItem(KEYS.transactions)
    return d ? JSON.parse(d) : []
  } catch {
    return []
  }
}

export async function saveTransactions(txs: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.transactions, JSON.stringify(txs))
}

export async function loadBudgets(): Promise<Budgets> {
  try {
    const d = await AsyncStorage.getItem(KEYS.budgets)
    return d ? JSON.parse(d) : {}
  } catch {
    return {}
  }
}

export async function saveBudgets(b: Budgets): Promise<void> {
  await AsyncStorage.setItem(KEYS.budgets, JSON.stringify(b))
}
