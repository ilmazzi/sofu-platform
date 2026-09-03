import './SoFuLandingC.css'
import { type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { SOFU_LANDING_IMAGES, SOFU_LANDING_VIDEO_URL } from './constants'
import { HeroVideo } from './HeroVideo'
import { SoFuCampaignCard } from './SoFuCampaignCard'
import { SoFuLogoWatermark } from './SoFuLogoMark'
import {
  formatLandingEuro,
  SoFuFooter,
  SoFuHeroBrand,
  SoFuStickyNav,
} from './shared'
import { useCountUp, useCycle, useInView } from './useSofuScrollFx'

type Campaign = components['schemas']['Campaign']

export interface SoFuLandingProps {
  campaign?: Campaign | null
  onSostieni?: () => void
  onAccediImpegno?: () => void
  videoUrl?: string
}

const DEFAULT_COSTS: { label: string; cents: number }[] = [
  { label: 'Sviluppo', cents: 5_000_000 },
  { label: 'Marketing', cents: 5_000_000 },
  { label: 'Costi legali', cents: 2_000_000 },
  { label: 'Server + HelpDesk', cents: 1_200_000 },
  { label: 'Sicurezza', cents: 800_000 },
]

const DEFAULT_TOTAL_CENTS = 14_000_100

export default function SoFuLandingC({
  campaign = null,
  onSostieni,
  onAccediImpegno,
  videoUrl = SOFU_LANDING_VIDEO_URL,
}: SoFuLandingProps): ReactElement {
  const cosaFx = useInView<HTMLElement>()
  const percheFx = useInView<HTMLElement>()
  const comeFx = useInView<HTMLElement>()

  const costRows = campaign?.cost_items?.length
    ? [...campaign.cost_items].sort((a, b) => a.sort_order - b.sort_order)
    : null
  const totalCents =
    campaign?.cost_subtotal_cents ?? campaign?.total_amount_cents ?? DEFAULT_TOTAL_CENTS

  const costSviluppo = useCountUp(
    (costRows?.find((r) => r.label.toLowerCase().includes('sviluppo'))?.amount_cents ??
      DEFAULT_COSTS[0].cents) / 100,
    comeFx.isInView,
  )
  const costMarketing = useCountUp(
    (costRows?.find((r) => r.label.toLowerCase().includes('marketing'))?.amount_cents ??
      DEFAULT_COSTS[1].cents) / 100,
    comeFx.isInView,
  )
  const costLegali = useCountUp(
    (costRows?.find((r) => r.label.toLowerCase().includes('legal'))?.amount_cents ??
      DEFAULT_COSTS[2].cents) / 100,
    comeFx.isInView,
  )
  const costServer = useCountUp(
    (costRows?.find((r) => r.label.toLowerCase().includes('server'))?.amount_cents ??
      DEFAULT_COSTS[3].cents) / 100,
    comeFx.isInView,
  )
  const costSicurezza = useCountUp(
    (costRows?.find((r) => r.label.toLowerCase().includes('sicurezza'))?.amount_cents ??
      DEFAULT_COSTS[4].cents) / 100,
    comeFx.isInView,
  )
  const costTotale = useCountUp(totalCents / 100, comeFx.isInView)

  const activeScenario = useCycle(3, 1900, comeFx.isInView)

  return (
    <div className="sofu-c-root">
      <SoFuStickyNav ctaHref="#sostieni" />

      <header className="sofu-c-hero">
        <div className="sofu-c-hero__blob-a" aria-hidden="true" />
        <div className="sofu-c-hero__blob-b" aria-hidden="true" />
        <SoFuLogoWatermark className="sofu-c-hero__watermark" />

        <div className="sofu-c-hero__inner">
          <SoFuHeroBrand />

          <div className="sofu-c-hero__row">
            <div className="sofu-c-hero__content">
              <span className="sofu-c-hero__badge">Un Crowdfunding per la comunità</span>
              <h1 className="sofu-c-display sofu-c-hero__title">
                Più persone sostengono, meno paga ciascuna.
              </h1>
              <p className="sofu-c-hero__subtitle">
              SoFu è la piattaforma che rimette le persone al centro: un tetto massimo al guadagno di chi lancia una campagna di raccolta fondi, un risparmio reale per chi crede nel progetto e lo sostiene insieme alle altre persone.
              </p>
              <div className="sofu-c-hero__actions">
                <a href="#sostieni" className="sofu-c-btn-primary">
                  Sostieni SoFu
                </a>
                
              </div>
            </div>

            <HeroVideo videoUrl={videoUrl} />
          </div>
        </div>
      </header>

      <section
        ref={cosaFx.ref}
        className={`sofu-c-section sofu-c-section--card sofu-reveal${cosaFx.isInView ? ' is-visible' : ''}`}
      >
        <div className="sofu-c-section__grid">
          <div className="sofu-c-section__text">
            <span className="sofu-c-section__tag sofu-c-section__tag--teal">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-700)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.05V17h6v-.25c0-.85.4-1.55 1-2.05A7 7 0 0 0 12 2Z" />
              </svg>
              COS&rsquo;È SOFU
            </span>
            <h2 className="sofu-c-display sofu-c-section__heading">
              Un&rsquo;idea semplice, contro le logiche di sempre
            </h2>
            <div className="sofu-c-section__body">
              <p>
                SoFu vuole essere una piattaforma di crowdfunding rivoluzionaria, che riporta al
                centro le persone e la realizzazione di progetti, togliendo potere
                all&rsquo;elemento capitalista.
              </p>
              <p>
                Le attuali piattaforme non fanno che ricalcare le dinamiche divisive in cui il fine
                è il guadagno. SoFu pone invece un limite al possibile guadagno di chi propone, in
                cambio di un risparmio per chi sostiene: il goal diventa la soglia{' '}
                <strong>massima</strong>, e più persone sostengono il progetto, meno pagherà
                ciascuna.
              </p>
              <p>
                Per capire come funziona, basta sostenere la campagna qui sotto &mdash; che serve
                esattamente per costruire la piattaforma stessa.
              </p>
            </div>
          </div>

          <div className="sofu-c-section__graphic">
            <img
              src={SOFU_LANDING_IMAGES.cosa}
              alt="Un gruppo di persone abbracciate guarda il mare e le cabinovie all'orizzonte."
              className="sofu-c-section__photo"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section
        ref={percheFx.ref}
        className={`sofu-c-section sofu-reveal${percheFx.isInView ? ' is-visible' : ''}`}
      >
        <div className="sofu-c-section__grid sofu-c-section__grid--reverse">
          <div className="sofu-c-section__graphic sofu-c-section__graphic--card">
            <img
              src={SOFU_LANDING_IMAGES.perche}
              alt="Due mani sorreggono della terra con una piccola pianta, vista dall'alto."
              className="sofu-c-section__photo"
              loading="lazy"
            />
          </div>

          <div className="sofu-c-section__text">
            <span className="sofu-c-section__tag sofu-c-section__tag--amber">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--amber-700)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
              PERCHÉ SUPPORTARCI
            </span>
            <h2 className="sofu-c-display sofu-c-section__heading">
              Un passo verso una società più equa
            </h2>
            <div className="sofu-c-section__body">
              <p>
                A noi sembra evidente che le idee di guadagno esagerato e di crescita continua
                siano insostenibili. Vorremmo realizzare uno strumento che permetta di realizzare
                progetti in maniera più umana e socialmente accettabile.
              </p>
              <p>
                Artiste e artisti, artigiane e artigiani, o semplici persone intraprendenti devono
                spesso far fronte a difficoltà economiche. Con SoFu vorremmo fare un passo verso un
                mondo dove denaro e lavoro tornino a essere un mezzo per realizzarsi, non un giogo.
              </p>
              <p>
                Supportando SoFu ci aiuti a costruire uno strumento utile per chi ha a cuore il
                pianeta, le persone e il futuro.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={comeFx.ref}
        className={`sofu-c-section sofu-c-section--card sofu-reveal${comeFx.isInView ? ' is-visible' : ''}`}
      >
        <div className="sofu-c-mechanism">
          <div className="sofu-c-mechanism__intro">
            <span className="sofu-c-section__tag sofu-c-section__tag--teal">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-700)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
              </svg>
              COME FARE E COSA SI OTTIENE
            </span>
            <h2 className="sofu-c-display sofu-c-section__heading">
              Il conto è semplice e trasparente
            </h2>
            <p>
              Ci servono circa <strong>140.000&nbsp;€</strong> per costruire SoFu. Il guadagno della
              piattaforma è di appena 1&nbsp;€: crediamo nella nostra idea, e speriamo vorrai
              crederci anche tu.
            </p>
          </div>

          <div className="sofu-c-costs-grid">
            <CostPill label="Sviluppo" value={formatLandingEuro(Math.round(costSviluppo))} />
            <CostPill label="Marketing" value={formatLandingEuro(Math.round(costMarketing))} />
            <CostPill label="Costi legali" value={formatLandingEuro(Math.round(costLegali))} />
            <CostPill
              label="Server + HelpDesk"
              value={formatLandingEuro(Math.round(costServer))}
            />
            <CostPill label="Sicurezza" value={formatLandingEuro(Math.round(costSicurezza))} />
            <CostPill label="Totale" value={formatLandingEuro(Math.round(costTotale))} total />
          </div>

          <div className="sofu-c-scenarios">
            <ScenarioCard count={10} suffix=" quote" delay={0} active={activeScenario === 0}>
              Non si realizza: cerchiamo altre strade per portare avanti l&rsquo;idea.
            </ScenarioCard>
            <ScenarioCard
              count={28}
              suffix=" quote"
              variant="goal"
              delay={90}
              active={activeScenario === 1}
            >
              SoFu prende vita: ogni quota vale 5.000€.
            </ScenarioCard>
            <ScenarioCard
              count={140000}
              suffix=" quote"
              variant="power"
              delay={180}
              active={activeScenario === 2}
            >
              Solo 1&nbsp;€ a testa: più persone sostengono, meno paga ciascuna.
            </ScenarioCard>
          </div>
        </div>
      </section>

      {campaign ? (
        <SoFuCampaignCard campaign={campaign} showSupportCta />
      ) : (
        <section id="sostieni" className="sofu-c-cta">
          <SoFuLogoWatermark className="sofu-c-cta__watermark" />
          <div className="sofu-c-cta__card">
            <div className="sofu-c-cta__header">
              <div>
                <span className="sofu-c-cta__eyebrow">STATO CAMPAGNA</span>
                <h2 className="sofu-c-display sofu-c-cta__title">Sostieni SoFu</h2>
              </div>
            </div>
            <div className="sofu-c-cta__actions">
              {onSostieni ? (
                <button type="button" className="sofu-c-cta__submit " onClick={onSostieni}>
                  Sostieni SoFu
                </button>
              ) : (
                <Link to="/sostieni" className="sofu-c-cta__submit ">
                  Sostieni SoFu
                </Link>
              )}
              {onAccediImpegno ? (
                <button type="button" className="sofu-c-cta__login" onClick={onAccediImpegno}>
                  Hai già sostenuto? Accedi al tuo impegno
                </button>
              ) : (
                <Link to="/login?next=/sostieni/stato" className="sofu-c-cta__login">
                  Hai già sostenuto? Accedi al tuo impegno
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <SoFuFooter />
    </div>
  )
}

function ScenarioCard({
  count,
  suffix = '',
  variant,
  delay = 0,
  active = false,
  children,
}: {
  count: number
  suffix?: string
  variant?: 'goal' | 'power'
  delay?: number
  active?: boolean
  children: ReactNode
}): ReactElement {
  const { ref, isInView } = useInView<HTMLDivElement>()
  const animatedCount = useCountUp(count, isInView, 1300)
  return (
    <div
      ref={ref}
      className={`sofu-c-scenario-card${variant ? ` sofu-c-scenario-card--${variant}` : ''} sofu-reveal${
        isInView ? ' is-visible' : ''
      }${active ? ' sofu-c-scenario-card--active' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="sofu-c-display sofu-c-scenario-card__value">
        {Math.round(animatedCount).toLocaleString('it-IT')}
        {suffix}
      </span>
      <p className="sofu-c-scenario-card__text">{children}</p>
    </div>
  )
}

function CostPill({
  label,
  value,
  total = false,
}: {
  label: string
  value: string
  total?: boolean
}): ReactElement {
  return (
    <div className={`sofu-c-cost-pill${total ? ' sofu-c-cost-pill--total' : ''}`}>
      <span className="sofu-c-cost-pill__label">{label}</span>
      <span className="sofu-c-display sofu-c-cost-pill__value">{value}</span>
    </div>
  )
}
