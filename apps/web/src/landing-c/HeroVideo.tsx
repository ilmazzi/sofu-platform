import { type ReactElement, useCallback, useRef, useState } from 'react'
import { SOFU_LANDING_VIDEO_POSTER } from './constants'

type Props = {
  videoUrl: string
  posterUrl?: string
}

/** Player hero con thumbnail (poster custom o primo frame del video). */
export function HeroVideo({
  videoUrl,
  posterUrl = SOFU_LANDING_VIDEO_POSTER,
}: Props): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [posterOk, setPosterOk] = useState(true)

  const usePosterImage = Boolean(posterUrl) && posterOk && !playing

  const primeThumbnail = useCallback(() => {
    if (usePosterImage || playing) return
    const video = videoRef.current
    if (!video) return
    const target =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1.5, video.duration * 0.08)
        : 0.5
    try {
      video.currentTime = target
    } catch {
      /* seek non sempre disponibile subito */
    }
  }, [usePosterImage, playing])

  function startPlay(): void {
    setPlaying(true)
    requestAnimationFrame(() => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = 0
      void video.play().catch(() => {
        /* autoplay bloccato: l'utente userà i controlli nativi */
      })
    })
  }

  return (
    <div id="video" className="sofu-c-hero__media">
      <div
        className={`sofu-c-video__frame${playing ? ' is-playing' : ''}`}
        role={playing ? undefined : 'button'}
        tabIndex={playing ? -1 : 0}
        aria-label={playing ? undefined : 'Riproduci il video dimostrativo SoFu'}
        onClick={playing ? undefined : startPlay}
        onKeyDown={
          playing
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  startPlay()
                }
              }
        }
      >
        {usePosterImage ? (
          <img
            src={posterUrl}
            alt=""
            className="sofu-c-video__poster"
            loading="eager"
            decoding="async"
            onError={() => setPosterOk(false)}
          />
        ) : null}

        <video
          ref={videoRef}
          className={`sofu-c-video__el${usePosterImage ? ' sofu-c-video__el--hidden' : ''}`}
          src={videoUrl}
          controls={playing}
          playsInline
          preload={playing ? 'auto' : 'metadata'}
          poster={posterUrl || undefined}
          onLoadedMetadata={primeThumbnail}
          onLoadedData={primeThumbnail}
        />

        {!playing ? (
          <div className="sofu-c-video__play" aria-hidden="true">
            <svg width="18" height="20" viewBox="0 0 20 22" fill="none" aria-hidden="true">
              <path d="M2 1 L19 11 L2 21 Z" fill="var(--card)" />
            </svg>
          </div>
        ) : null}
      </div>
      <p className="sofu-c-video__caption">
        Il meccanismo di SoFu spiegato in 4 minuti.
      </p>
    </div>
  )
}
