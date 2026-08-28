import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { SoFuCampaignCard } from '../landing-c/SoFuCampaignCard'
import { SoFuCostBreakdown } from '../landing-c/SoFuCostBreakdown'
import { SoFuPledgeShell } from '../landing-c/shared'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'
import { reservationStatusLabel } from '../lib/reservationLabels'

type Campaign = components['schemas']['Campaign']
type Reservation = components['schemas']['Reservation']

export default function FoundingStatusPage(): ReactElement {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justPledged = Boolean((location.state as { justPledged?: boolean } | null)?.justPledged)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(
    justPledged ? 'Promessa registrata. Grazie per aver sostenuto SoFu.' : null,
  )
  const [pending, setPending] = useState(false)
  const [extraDrops, setExtraDrops] = useState('1')

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const [campRes, mineRes] = await Promise.all([
        apiFetch('/api/v1/founding/campaign'),
        apiFetch('/api/v1/founding/my-reservation'),
      ])

      if (campRes.ok) {
        const json = (await campRes.json()) as { data: Campaign }
        setCampaign(json.data)
      }

      if (mineRes.status === 404) {
        setReservation(null)
        return
      }
      if (!mineRes.ok) {
        setError(`Impossibile caricare la promessa (${mineRes.status}).`)
        setReservation(null)
        return
      }
      const json = (await mineRes.json()) as { data: Reservation }
      setReservation(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete.')
      setReservation(null)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login?next=/sostieni/stato', { replace: true })
      return
    }
    setLoaded(false)
    void load()
  }, [authLoading, user, navigate, load])

  async function onCancel(): Promise<void> {
    if (!reservation) return
    if (!window.confirm('Vuoi ritirare tutta la promessa?')) return
    setPending(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/v1/reservations/${reservation.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setError(body?.message ?? `Operazione non riuscita (${res.status}).`)
        return
      }
      setMessage('Promessa ritirata.')
      setReservation(null)
      await load()
    } finally {
      setPending(false)
    }
  }

  async function onAddDrops(): Promise<void> {
    if (!reservation) return
    const n = Number(extraDrops)
    if (!Number.isFinite(n) || n < 1) {
      setError('Indica almeno 1 quota da aggiungere.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/v1/reservations/${reservation.id}/drops`, {
        method: 'POST',
        json: { additional_drop_count: n },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setError(body?.message ?? `Operazione non riuscita (${res.status}).`)
        return
      }
      setMessage(`Aggiunte ${n} quote alla tua promessa.`)
      await load()
    } finally {
      setPending(false)
    }
  }

  return (
    <SoFuPledgeShell title="Il tuo impegno">
      {message ? <div className="sofu-c-alert sofu-c-alert--success">{message}</div> : null}
      {error ? <div className="sofu-c-alert sofu-c-alert--error">{error}</div> : null}

      {campaign ? <SoFuCampaignCard campaign={campaign} compact /> : null}

      {campaign?.cost_items?.length ? (
        <SoFuCostBreakdown
          items={campaign.cost_items}
          currency={campaign.currency}
          totalCents={campaign.cost_subtotal_cents ?? campaign.total_amount_cents}
        />
      ) : null}

      <div className="sofu-c-form-card">
        {authLoading || !loaded ? (
          <p className="sofu-c-muted">Caricamento…</p>
        ) : !reservation ? (
          <div className="sofu-c-form-stack">
            <p className="sofu-c-muted">Non hai ancora una promessa attiva su questa campagna.</p>
            <Link to="/sostieni" className="sofu-c-cta__submit">
              Sostieni SoFu
            </Link>
          </div>
        ) : (
          <div className="sofu-c-form-stack">
            <h2 className="sofu-c-form-card__title">La tua adesione</h2>

            <div className="sofu-c-status-row">
              <span>
                Stato: <strong>{reservationStatusLabel(reservation.status)}</strong>
              </span>
            </div>
            <div className="sofu-c-status-row">
              <span>
                Quote promesse: <strong>{reservation.drop_count}</strong>
              </span>
            </div>
            <div className="sofu-c-status-row">
              <span>
                Impegno registrato:{' '}
                <strong>
                  {formatEuro(reservation.effective_price_cents, campaign?.currency ?? 'EUR')}
                </strong>
              </span>
            </div>
            {reservation.payment_method_verified_at ? (
              <div className="sofu-c-status-row">
                <span>
                  Carta verificata il{' '}
                  {new Date(reservation.payment_method_verified_at).toLocaleString('it-IT')}
                </span>
              </div>
            ) : null}

            <div className="sofu-c-status-divider" />

            <h3 className="sofu-c-form-card__title" style={{ fontSize: '18px', marginBottom: 12 }}>
              Aumenta le quote
            </h3>
            <div className="sofu-c-field" style={{ maxWidth: 200 }}>
              <label htmlFor="extra-drops">Quote da aggiungere</label>
              <input
                id="extra-drops"
                type="number"
                min={1}
                max={10000}
                value={extraDrops}
                onChange={(e) => setExtraDrops(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="sofu-c-cta__submit"
              disabled={pending}
              onClick={() => void onAddDrops()}
              style={{ maxWidth: 280 }}
            >
              {pending ? 'Attendere…' : 'Aggiungi quote'}
            </button>

            <button
              type="button"
              className="sofu-c-btn-outline"
              disabled={pending}
              onClick={() => void onCancel()}
            >
              Ritira la promessa
            </button>
          </div>
        )}
      </div>

      <Link to="/" className="sofu-c-btn-back">
        Torna alla landing
      </Link>
    </SoFuPledgeShell>
  )
}
