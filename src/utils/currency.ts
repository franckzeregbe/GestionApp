import { type CurrencyId } from '../types'

export const CURRENCIES: Record<CurrencyId, { label: string; loc: string; dec: number; sym: string }> = {
  cad:  { label: 'CAD',  loc: 'fr-CA', dec: 2, sym: '$'    },
  usd:  { label: 'USD',  loc: 'en-US', dec: 2, sym: '$'    },
  eur:  { label: 'EUR',  loc: 'fr-FR', dec: 2, sym: '€'    },
  fcfa: { label: 'FCFA', loc: 'fr-FR', dec: 0, sym: 'FCFA' },
}

/**
 * Taux de change : 1 unité de cette devise = X EUR
 * Le FCFA est peggé à l'EUR : 1 EUR = 655,957 FCFA
 * Taux approximatifs (juillet 2024)
 */
const TO_EUR: Record<CurrencyId, number> = {
  eur:  1,           // 1 EUR = 1 EUR
  usd:  0.92,        // 1 USD = 0.92 EUR (1 EUR ≈ 1.08 USD)
  cad:  0.68,        // 1 CAD = 0.68 EUR (1 EUR ≈ 1.47 CAD)
  fcfa: 0.0015245,   // 1 FCFA = 0.0015245 EUR (1 EUR = 655,957 FCFA)
}

/**
 * Convertit un montant d'une devise vers une autre.
 * Passe par EUR comme devise pivot.
 */
export function convert(amount: number, from: CurrencyId, to: CurrencyId): number {
  if (from === to) return amount
  // Conversion via EUR
  const inEur = amount * TO_EUR[from]
  return inEur / TO_EUR[to]
}

/**
 * Formate un nombre dans la devise cible, sans conversion.
 * Utiliser convert() avant si nécessaire.
 */
export function fmt(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const formatted = n.toLocaleString(c.loc, { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec })
  return currency === 'fcfa' ? `${formatted} FCFA` : `${c.sym}${formatted}`
}

/**
 * Formate en compact (entier + suffixe k pour milliers), sans conversion.
 */
export function fmtShort(n: number, currency: CurrencyId = 'cad'): string {
  const c = CURRENCIES[currency]
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const val = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs))
  return currency === 'fcfa' ? `${sign}${val} FCFA` : `${sign}${c.sym}${val}`
}

/**
 * Convertit ET formate en une seule étape.
 * C'est la fonction principale à utiliser dans les écrans.
 */
export function fmtC(amount: number, from: CurrencyId, to: CurrencyId): string {
  return fmt(convert(amount, from, to), to)
}

/**
 * Convertit ET formate en compact.
 */
export function fmtShortC(amount: number, from: CurrencyId, to: CurrencyId): string {
  return fmtShort(convert(amount, from, to), to)
}

/** Génère une clé YYYY-MM pour regrouper par mois */
export function mkKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Parse une date YYYY-MM-DD sans décalage timezone */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
