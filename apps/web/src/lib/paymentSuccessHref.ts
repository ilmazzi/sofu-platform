/** Aggiunge query per mostrare un messaggio di conferma sulla pagina di destinazione. */
export function paymentSuccessHref(nextPath: string): string {
  const sep = nextPath.includes('?') ? '&' : '?'
  return `${nextPath}${sep}payment=success`
}
