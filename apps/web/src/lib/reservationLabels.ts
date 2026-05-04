/** Etichette italiane per lo stato del droplet / reservation (API). */
export function reservationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'In attesa',
    active: 'Promessa di contributo (annaffiatoio)',
    cancelled: 'Annullata',
    expired: 'Scaduta',
    converted_to_payment: 'Pagamento completato',
    failed: 'Pagamento non riuscito',
  }
  return map[status] ?? status
}
