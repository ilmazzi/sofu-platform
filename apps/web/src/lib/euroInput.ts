/** Converte input tipo "1400,50" o "1.400,50" in centesimi (intero). */
export function parseEuroInputToCents(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '')
  if (s === '') return null
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Mostra centesimi come stringa euro per campi con virgola (senza simbolo €). */
export function formatCentsAsEuroField(cents: number): string {
  return (cents / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
