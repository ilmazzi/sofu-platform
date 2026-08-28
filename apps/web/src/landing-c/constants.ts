export const SOFU_LANDING_VIDEO_URL =
  import.meta.env.VITE_LANDING_VIDEO_URL?.trim() ||
  'https://pub-a885598e7c0a43ef90ae3f111150b219.r2.dev/prova_con_metal.mp4'

/** Thumbnail custom (jpg/webp in /public o URL). Vuoto = primo frame del mp4. */
export const SOFU_LANDING_VIDEO_POSTER =
  import.meta.env.VITE_LANDING_VIDEO_POSTER?.trim() || ''

/**
 * Immagini servite da /public/landing (affidabili in dev e prod).
 * Per URL esterni usa sempre il CDN diretto, es. images.unsplash.com/photo-…
 * — mai link alla pagina unsplash.com/it/foto/… (non funzionano in <img>).
 */
export const SOFU_LANDING_IMAGES = {
  cosa: '/landing/cosa.jpg',
  perche: '/landing/perche.jpg',
} as const
