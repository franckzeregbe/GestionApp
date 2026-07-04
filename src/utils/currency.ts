import { type CurrencyId } from '../types'

export const CURRENCIES: Record<CurrencyId, { label: string; loc: string; dec: number; sym: string; rate: number }> = {
  cad: { label: '$ CA', loc: 'fr-CA', dec: 2, sym: '$', rate: 1 },
  usd: { label: '$ US', loc: 'en-US', dec: 2, sym: '$', rate: 0.73 },
  fcfa: { label: 'FCFA', loc: 'fr-FR', dec: 0, sym: 'FCFA', rate: 450 },
  eur: { label: '€ EUR', loc: 'fr-FR', dec: 2, sym: '€', rate: 0.68 },
}

/**
 * Format currency with full precision (decimals as defined per currency).
 * Use for main balance displays, transaction amounts, and budget values.
 */
export function fmt(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const converted = n * c.rate
  return `${converted.toLocaleString(c.loc, { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec })} ${c.sym === 'FCFA' ? 'FCFA' : c.sym}`
}

/**
 * Format currency in compact form (rounded to whole numbers, with 'k' suffix for thousands).
 * Use for chart labels, small display areas, and summary statistics.
 */
export function fmtShort(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const converted = n * c.rate
  const sym = c.sym === 'FCFA' ? 'FCFA' : c.sym
  if (Math.abs(converted) >= 1000) return `${(converted / 1000).toFixed(1)}k ${sym}`
  return `${Math.round(converted).toLocaleString(c.loc)} ${sym}`
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
