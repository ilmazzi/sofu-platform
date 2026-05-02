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
  }
  return map[status] ?? status
}

export function campaignStatusBadgeColor(status: string): string {
  if (status === 'published' || status === 'activated') return 'teal'
  if (status === 'submitted_for_review') return 'yellow'
  if (status === 'approved') return 'blue'
  return 'gray'
}

export function campaignCategoryLabel(cat: string | null | undefined): string | null {
  if (!cat) return null
  const map: Record<string, string> = {
    education: 'Educazione',
    environment: 'Ambiente',
    health: 'Salute',
    community: 'Comunità',
  }
  return map[cat] ?? cat
}
