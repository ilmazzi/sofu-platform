import type { components } from '@sofu/contracts'

export const GUADAGNO_COST_LABEL = 'Guadagno'

export type CampaignCostItem = components['schemas']['CampaignCostItem']

export function isGuadagnoCostLabel(label: string): boolean {
  return label.trim().toLowerCase() === GUADAGNO_COST_LABEL.toLowerCase()
}

export function splitCostItems(items: CampaignCostItem[]): {
  editable: CampaignCostItem[]
  guadagno: CampaignCostItem | null
} {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  let guadagno: CampaignCostItem | null = null
  const editable: CampaignCostItem[] = []
  for (const item of sorted) {
    if (isGuadagnoCostLabel(item.label)) {
      guadagno = item
    } else {
      editable.push(item)
    }
  }
  return { editable, guadagno }
}

/** Creator dichiara guadagno zero: messaggio di trasparenza in elenco campagna. */
export function hasTransparentZeroProfit(items: CampaignCostItem[] | undefined): boolean {
  if (!items?.length) return false
  const { guadagno } = splitCostItems(items)
  return guadagno !== null && guadagno.amount_cents === 0
}

export const ZERO_PROFIT_BADGE = 'Guadagno 0 € — trasparenza'

export const ZERO_PROFIT_DETAIL_HINT =
  'Il creator dichiara di non trattenere guadagno su questa campagna: punta su onestà e trasparenza verso chi sostiene.'
