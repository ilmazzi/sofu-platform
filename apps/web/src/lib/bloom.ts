/**
 * Bloom / Full bloom (UI e regole business in evoluzione).
 * Naming UI: prima del Bloom le adesioni contano come **growing drops** (crescita seme → Bloom); dopo il Bloom
 * diventano **blooming drops** (fioritura verso il tetto). Il valore della Drop resta quello d’ingresso fino al Bloom;
 * dopo può scendere verso il minimo fino a full bloom o chiusura. L’addebito non coincide con la sola offerta sul sito.
 * Backend: `Campaign::hasReachedBloom()` — obiettivo growing drops o campagna successful/closed.
 */

export type BloomCampaignFields = {
  target_supporters: number
  active_reservations_count: number
  status: string
}

export function campaignHasReachedBloom(c: BloomCampaignFields): boolean {
  if (!c.target_supporters || c.target_supporters <= 0) return false
  if (c.active_reservations_count >= c.target_supporters) return true
  return c.status === 'successful' || c.status === 'closed'
}

/** Avanzamento verso il Bloom (0–100), in base all’obiettivo persone della campagna. */
export function campaignBloomProgressPercent(
  c: Pick<BloomCampaignFields, 'target_supporters' | 'active_reservations_count'>,
): number {
  if (!c.target_supporters || c.target_supporters <= 0) return 0
  return Math.min(100, (100 * c.active_reservations_count) / c.target_supporters)
}

export function reservationEligibleForPayment(status: string, bloomed: boolean): boolean {
  if (!bloomed) return false
  return status === 'active' || status === 'failed'
}

/** Stati che impediscono una nuova drop sulla stessa campagna (allineato a CreateReservationAction). */
const BLOCKING_RESERVATION_STATUSES = ['pending', 'active', 'failed', 'converted_to_payment'] as const

export function reservationBlocksNewDroplet(status: string): boolean {
  return (BLOCKING_RESERVATION_STATUSES as readonly string[]).includes(status)
}
