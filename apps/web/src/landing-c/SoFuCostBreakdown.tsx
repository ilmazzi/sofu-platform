import type { ReactElement } from 'react'
import type { components } from '@sofu/contracts'
import { formatEuro } from '../lib/campaignMetrics'
import { formatLandingEuro } from './shared'

type CostItem = components['schemas']['CampaignCostItem']

type Props = {
  items: CostItem[]
  currency?: string
  totalCents?: number | null
}

export function SoFuCostBreakdown({
  items,
  currency = 'EUR',
  totalCents,
}: Props): ReactElement | null {
  const rows = [...items].sort((a, b) => a.sort_order - b.sort_order)
  if (rows.length === 0) return null

  const sum = rows.reduce((s, r) => s + r.amount_cents, 0)
  const total = totalCents ?? sum

  return (
    <div className="sofu-c-form-card" aria-label="Voci di costo della campagna">
      <h2 className="sofu-c-form-card__title">Voci di costo</h2>
      <div className="sofu-c-costs-grid" style={{ gridTemplateColumns: '1fr' }}>
        {rows.map((row) => (
          <div key={row.id} className="sofu-c-cost-pill">
            <span className="sofu-c-cost-pill__label">{row.label}</span>
            <span className="sofu-c-display sofu-c-cost-pill__value">
              {formatEuro(row.amount_cents, currency)}
            </span>
          </div>
        ))}
        <div className="sofu-c-cost-pill sofu-c-cost-pill--total">
          <span className="sofu-c-cost-pill__label">Totale</span>
          <span className="sofu-c-display sofu-c-cost-pill__value">
            {formatLandingEuro(total / 100)}
          </span>
        </div>
      </div>
    </div>
  )
}
