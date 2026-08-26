/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Public URL of the founding landing demo video (mp4). */
  readonly VITE_LANDING_VIDEO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
