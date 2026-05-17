import type { components } from '@sofu/contracts'
import { formatEuro } from './campaignMetrics'

type Campaign = components['schemas']['Campaign']

/** Testi esplicativi allineati al modello: impegno ≠ prelievo immediato; prezzo stabile fino al Bloom; calo post-Bloom fino a Full bloom / chiusura. */

/** Etichette quota: growing (seme → Bloom) vs blooming (dopo Bloom). */
export const LABEL_GROWING_DROP = 'Growing Drop'
export const LABEL_BLOOMING_DROP_CURRENT = 'Valore attuale Blooming Drop'
export const LABEL_BLOOMING_DROP_LIMIT = 'Valore limite Blooming Drop'

export const DROP_NO_IMMEDIATE_CHARGE =
  'Partecipare non significa che l’importo lasci subito il tuo conto: è un impegno sull’offerta (la tua Drop). L’addebito avviene solo quando la campagna e le regole di pagamento lo prevedono — non al solo clic di adesione.'

export const DROP_STABLE_UNTIL_BLOOM =
  'Fino al raggiungimento del Bloom, il valore della tua Drop resta quello dell’offerta con cui sei entrato. Solo dopo il Bloom l’importo della Drop può aggiornarsi verso il basso, man mano che la campagna si avvicina al Full bloom o alla scadenza.'

export function dropMaxDecreaseCaption(c: Campaign): string {
  const max = formatEuro(c.max_price_cents, c.currency)
  const min = formatEuro(c.min_price_cents, c.currency)
  const cap = c.full_bloom_drops
  const capBit =
    cap !== null && cap !== undefined
      ? `Se tutte le blooming drops previste al tetto fioritura (${cap} posti) vengono riempite, `
      : 'Se la campagna raggiunge la fioritura completa, '
  return (
    `${capBit}ogni Blooming Drop può scendere al massimo da ${max} (${LABEL_GROWING_DROP}) a ${min} (${LABEL_BLOOMING_DROP_LIMIT}). ` +
    'Growing / blooming = quante adesioni (posti); l’euro accanto è quanto costa una quota in quel momento. ' +
    'La differenza tra offerta iniziale e offerta finale è lo spazio delle droplet: come le gestisce il creator (beneficenza, SoFu, trattenuta) lo chiariremo in piattaforma.'
  )
}

export const DROP_QUOTE_VS_VALUE_HINT =
  'Per non confondere: prima del Bloom parliamo di growing drops (posti in crescita); dopo il Bloom, di blooming drops verso il tetto fioritura. L’euro accanto alle soglie è “quanto costa una quota” in quel momento.'

export const DROP_DROPLETS_AND_CREATOR =
  'Le droplet sono la differenza tra offerta iniziale e offerta finale della Drop: restano in capo a chi ha creato la campagna (come nel crowdfunding classico) — in beneficenza, in parte su SoFu per altre campagne, o in trattenuta — secondo le opzioni che la piattaforma metterà a disposizione.'
