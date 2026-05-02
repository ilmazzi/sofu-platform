/** Etichette italiane per lo stato prenotazione (API). */
export function reservationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'In attesa',
    active: 'Attiva — completa il pagamento',
    cancelled: 'Annullata',
    expired: 'Scaduta',
    converted_to_payment: 'Pagamento completato',
    failed: 'Pagamento non riuscito',
  }
  return map[status] ?? status
}
