import { CAMPAIGN_CATEGORY_OPTIONS } from './campaignCategories'

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CAMPAIGN_CATEGORY_OPTIONS.filter((o) => o.value !== '').map((o) => [o.value, o.label]),
)

export function campaignStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Bozza',
    submitted_for_review: 'In revisione',
    approved: 'Approvata',
    published: 'Pubblicata',
    activated: 'Attiva',
    cancelled: 'Annullata',
    expired: 'Scaduta',
    successful: 'Riuscita',
    closed: 'Chiusa',
    failed: 'Non riuscita',
    rejected: 'Rifiutata',
  }
  return map[status] ?? status
}

export function campaignStatusBadgeColor(status: string): string {
  if (status === 'published' || status === 'activated') return 'teal'
  if (status === 'submitted_for_review') return 'yellow'
  if (status === 'approved') return 'blue'
  if (status === 'rejected') return 'red'
  return 'gray'
}

export function campaignCategoryLabel(cat: string | null | undefined): string | null {
  if (!cat) return null
  return CATEGORY_LABELS[cat] ?? cat
}
