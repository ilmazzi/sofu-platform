import type { components } from '@sofu/contracts'

type Campaign = components['schemas']['Campaign']

/** Quota verso l’obiettivo di persone (0–100). */
export function supporterProgressPercent(c: Campaign): number {
  if (!c.target_supporters || c.target_supporters <= 0) return 0
  return Math.min(100, (100 * c.active_reservations_count) / c.target_supporters)
}

/**
 * Quanto il prezzo attuale si è avvicinato al minimo rispetto al “picco” iniziale (0 = ancora al max, 100 = al min).
 */
export function priceDropProgressPercent(c: Campaign): number {
  const max = c.max_price_cents
  const min = c.min_price_cents
  const cur = c.current_price_cents
  if (max <= min) return 100
  return Math.min(100, Math.max(0, ((max - cur) / (max - min)) * 100))
}

/** Risparmio rispetto al prezzo di picco (primi posti / “goccia” alta), in euro. */
export function savingsVsPeakEuro(c: Campaign): number {
  return Math.max(0, (c.max_price_cents - c.current_price_cents) / 100)
}

/**
 * Prezzo atteso se entrasse **un altro** sostenitore (stesso `total_amount`, n+1 quote).
 * Allinea la logica backend: ceil(total/n+1) clamp tra min e max.
 */
export function priceIfOneMoreSupporterCents(c: Campaign): number {
  const n = c.active_reservations_count
  const raw = Math.ceil(c.total_amount_cents / (n + 1))
  return Math.max(c.min_price_cents, Math.min(c.max_price_cents, raw))
}

export function formatEuro(cents: number, currency = 'EUR'): string {
  return (cents / 100).toLocaleString('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatDateIt(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}
