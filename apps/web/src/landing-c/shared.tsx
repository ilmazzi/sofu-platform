import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SoFuLogoFull, SoFuLogoWatermark } from './SoFuLogoMark'
import { useScrolled } from './useSofuScrollFx'
import './SoFuLandingC.css'

export function SoFuStickyNav({
  ctaHref = '/sostieni',
  ctaLabel = 'Sostieni SoFu',
  homeHref = '/',
}: {
  ctaHref?: string
  ctaLabel?: string
  homeHref?: string
}): ReactElement {
  const scrolled = useScrolled(140)

  return (
    <header
      className={`sofu-c-sticky-nav${scrolled ? ' is-scrolled' : ''}`}
      aria-hidden={!scrolled}
    >
      <div className="sofu-c-sticky-nav__inner">
        <Link to={homeHref} className="sofu-c-sticky-nav__brand" tabIndex={scrolled ? 0 : -1}>
          <SoFuLogoFull height={34} color="var(--ink)" />
        </Link>
        <Link to={ctaHref} className="sofu-c-sticky-nav__cta" tabIndex={scrolled ? 0 : -1}>
          {ctaLabel}
        </Link>
      </div>
    </header>
  )
}

export function SoFuFooter(): ReactElement {
  return (
    <footer className="sofu-c-footer">
      <span className="sofu-c-display sofu-c-footer__brand-name">SoFu</span>
      <span className="sofu-c-footer__meta">
        2026 SoFu &middot; Piattaforma di crowdfunding di comunità
      </span>
    </footer>
  )
}

export function SoFuHeroBrand(): ReactElement {
  return (
    <div className="sofu-c-hero__brand">
      <SoFuLogoFull height={72} color="oklch(98% 0.006 90)" />
    </div>
  )
}

export function SoFuPledgeShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="sofu-c-root">
      <SoFuStickyNav />
      <header className="sofu-c-hero sofu-c-hero--sub">
        <div className="sofu-c-hero__blob-a" aria-hidden="true" />
        <div className="sofu-c-hero__blob-b" aria-hidden="true" />
        <SoFuLogoWatermark className="sofu-c-hero__watermark" />
        <div className="sofu-c-hero__inner">
          <SoFuHeroBrand />
          <div className="sofu-c-hero__content">
            <h1 className="sofu-c-display sofu-c-hero__title">{title}</h1>
            {subtitle ? <p className="sofu-c-hero__subtitle">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <div className="sofu-c-page">
        <div className="sofu-c-page__inner">{children}</div>
      </div>
      <SoFuFooter />
    </div>
  )
}

export function formatLandingEuro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}
