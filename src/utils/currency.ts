import { type CurrencyId } from '../types'

export const CURRENCIES: Record<CurrencyId, { label: string; loc: string; dec: number; sym: string }> = {
  cad: { label: '$ CA', loc: 'fr-CA', dec: 2, sym: '$' },
  usd: { label: '$ US', loc: 'en-US', dec: 2, sym: '$' },
  fcfa: { label: 'FCFA', loc: 'fr-FR', dec: 0, sym: 'FCFA' },
  eur: { label: '€ EUR', loc: 'fr-FR', dec: 2, sym: '€' },
}

/**
 * Format a number in the selected currency.
 * Amounts are stored as-is in the user's chosen currency — no conversion applied.
 */
export function fmt(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const formatted = n.toLocaleString(c.loc, { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec })
  return currency === 'fcfa' ? `${formatted} FCFA` : `${c.sym}${formatted}`
}

/**
 * Compact format: whole numbers, 'k' suffix for thousands.
 */
export function fmtShort(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const val = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs))
  return currency === 'fcfa' ? `${sign}${val} FCFA` : `${sign}${c.sym}${val}`
}

/**
 * Month key generation utility.
 * Generates a YYYY-MM string for date matching and grouping.
 * Used across DashboardScreen, ChartsScreen, and BudgetsScreen.
 */
export function mkKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Parse a YYYY-MM-DD date string safely without timezone shift */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
