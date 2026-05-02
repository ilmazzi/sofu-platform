/** Immagini locali (in `public/images/campaign-growth/`). La fase segue l’avanzamento % sostenitori. */
export const CAMPAIGN_GROWTH_STAGES = [
  {
    img: '/images/campaign-growth/stage-seme.png',
    label: 'Seme',
  },
  {
    img: '/images/campaign-growth/stage-germoglio.png',
    label: 'Germoglio',
  },
  {
    img: '/images/campaign-growth/stage-crescita.png',
    label: 'Crescita',
  },
  {
    img: '/images/campaign-growth/stage-bocciolo.png',
    label: 'Bocciolo',
  },
  {
    img: '/images/campaign-growth/stage-fioritura.png',
    label: 'Fioritura',
  },
] as const

export type CampaignGrowthStage = (typeof CAMPAIGN_GROWTH_STAGES)[number]

/** Indice 0–4 in base alla % obiettivo persone (0–100). Soglie: 10, 30, 55, 80. */
export function growthStageIndexFromSupporterPercent(progress: number): number {
  const p = Math.min(100, Math.max(0, progress))
  if (p < 10) return 0
  if (p < 30) return 1
  if (p < 55) return 2
  if (p < 80) return 3
  return 4
}

export function growthStageFromSupporterPercent(progress: number): CampaignGrowthStage {
  return CAMPAIGN_GROWTH_STAGES[growthStageIndexFromSupporterPercent(progress)]!
}
