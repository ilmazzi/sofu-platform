/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Public URL of the founding landing demo video (mp4). */
  readonly VITE_LANDING_VIDEO_URL?: string
  /** Thumbnail/poster del video landing (jpg, webp o URL). */
  readonly VITE_LANDING_VIDEO_POSTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
