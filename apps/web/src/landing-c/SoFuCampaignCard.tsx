import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useCountUp, useInView } from './useSofuScrollFx'
import { formatLandingEuro } from './shared'
import { SoFuLogoWatermark } from './SoFuLogoMark'

type Campaign = components['schemas']['Campaign']

type Props = {
  campaign: Campaign
  showSupportCta?: boolean
  compact?: boolean
}

export function SoFuCampaignCard({
  campaign,
  showSupportCta = false,
  compact = false,
}: Props): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>()
  const ringCircumference = 201

  const targetProgressPct = Math.min(
    100,
    campaign.target_supporters > 0
      ? Math.round((campaign.active_reservations_count / campaign.target_supporters) * 100)
      : 0,
  )
  const missing = Math.max(0, campaign.target_supporters - campaign.active_reservations_count)

  const progressPct = Math.round(useCountUp(targetProgressPct, isInView))
  const quotaAttuale = useCountUp(campaign.current_price_cents / 100, isInView)
  const obiettivo = useCountUp(campaign.total_amount_cents / 100, isInView)
  const maxQuota = useCountUp(campaign.max_price_cents / 100, isInView)
  const minQuota = useCountUp(campaign.min_price_cents / 100, isInView)
  const ringOffset = ringCircumference - (ringCircumference * progressPct) / 100

  return (
    <section
      ref={ref}
      id={compact ? undefined : 'sostieni'}
      className={compact ? undefined : 'sofu-c-cta'}
      aria-label="Stato campagna"
    >
      {!compact ? <SoFuLogoWatermark className="sofu-c-cta__watermark" /> : null}
      <div className="sofu-c-cta__card" style={compact ? { maxWidth: '100%' } : undefined}>
        <div className="sofu-c-cta__header">
          <div>
            <span className="sofu-c-cta__eyebrow">STATO CAMPAGNA</span>
            <h2 className="sofu-c-display sofu-c-cta__title">{campaign.title}</h2>
            <p className="sofu-c-cta__missing">
              {missing > 0 ? `Mancano ${missing} quote al Bloom.` : 'Bloom raggiunto — il goal è coperto.'}
            </p>
          </div>
          <div className="sofu-c-cta__ring-wrap">
            <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
              <circle cx="38" cy="38" r="32" fill="none" stroke="var(--paper-alt)" strokeWidth="7" />
              <circle
                cx="38"
                cy="38"
                r="32"
                fill="none"
                stroke="var(--teal-700)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 38 38)"
              />
            </svg>
            <span className="sofu-c-cta__ring-value">{progressPct}%</span>
          </div>
        </div>

        <div className="sofu-c-cta__track">
          <div className="sofu-c-cta__fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="sofu-c-cta__missing" style={{ marginTop: -16 }}>
          {campaign.active_reservations_count} / {campaign.target_supporters} quote Bloom
        </p>

        <div className="sofu-c-cta__stats">
          <Stat label="Quota attuale" value={formatLandingEuro(quotaAttuale)} />
          <Stat label="Obiettivo" value={formatLandingEuro(obiettivo)} />
          <Stat label="Max quota" value={formatLandingEuro(maxQuota)} />
          <Stat label="Può scendere a" value={formatLandingEuro(minQuota)} accent />
        </div>

        {showSupportCta ? (
          <div className="sofu-c-cta__actions">
            <Link to="/sostieni" className="sofu-c-cta__submit">
              Sostieni SoFu
            </Link>
            <Link to="/login?next=/sostieni/stato" className="sofu-c-cta__login">
              Hai già sostenuto? Accedi al tuo impegno
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}): ReactElement {
  return (
    <div className={`sofu-c-cta__stat${accent ? ' sofu-c-cta__stat--accent' : ''}`}>
      <span className="sofu-c-cta__stat-label">{label}</span>
      <br />
      <span className="sofu-c-display sofu-c-cta__stat-value">{value}</span>
    </div>
  )
}
