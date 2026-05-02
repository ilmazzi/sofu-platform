/**
 * Copertine campagna: rotazione fissa di foto Unsplash curate (stesso slug → stessa immagine).
 * Parametri crop uniformi per aspetto coerente sulle card.
 */
const COVER_IMAGE_URLS: readonly string[] = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1531206715517-57cbe4944343?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1521737711868-e3b97375f902?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a35?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1470240731272-7821a6eeb6bd?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1544027993-37dbfe43aac0?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&h=788&q=88',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&h=788&q=88',
]

function slugHash(slug: string): number {
  let h = 2166136261
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

export function campaignCoverPhotoUrl(slug: string): string {
  const idx = slugHash(slug) % COVER_IMAGE_URLS.length
  return COVER_IMAGE_URLS[idx] ?? COVER_IMAGE_URLS[0]
}

/** Sfondo di fallback se la foto non carica (nessuna richiesta esterna). */
export function campaignCoverGradient(slug: string): string {
  let h = 21609017
  for (let i = 0; i < slug.length; i += 1) {
    h = Math.imul(31, h) + slug.charCodeAt(i)
  }
  const hue1 = Math.abs(h) % 360
  const hue2 = (hue1 + 38 + (Math.abs(h >> 8) % 80)) % 360
  return `linear-gradient(145deg, hsl(${hue1} 52% 22%) 0%, hsl(${hue2} 48% 38%) 55%, hsl(${(hue1 + 22) % 360} 55% 32%) 100%)`
}
