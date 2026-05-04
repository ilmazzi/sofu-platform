/** Allineate ai filtri della pagina Campagne pubbliche. */
export const CAMPAIGN_CATEGORY_OPTIONS = [
  { value: '', label: 'Nessuna' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'art', label: 'Arte' },
  { value: 'music', label: 'Musica' },
  { value: 'film', label: 'Film' },
  { value: 'games', label: 'Giochi' },
  { value: 'food', label: 'Cibo' },
  { value: 'fashion', label: 'Moda' },
  { value: 'design', label: 'Design' },
  { value: 'publishing', label: 'Editoria' },
  { value: 'education', label: 'Educazione' },
  { value: 'environment', label: 'Ambiente' },
  { value: 'health', label: 'Salute' },
  { value: 'community', label: 'Comunità' },
] as const

export const CAMPAIGN_CATEGORY_FILTER_OPTIONS = CAMPAIGN_CATEGORY_OPTIONS.filter((o) => o.value !== '')
