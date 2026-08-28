import { type FormEvent, type ReactElement, useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { StripeSetupForm } from '../components/StripeSetupForm'
import { useAuth } from '../context/AuthContext'
import { SoFuCampaignCard } from '../landing-c/SoFuCampaignCard'
import { SoFuCostBreakdown } from '../landing-c/SoFuCostBreakdown'
import { SoFuPledgeShell } from '../landing-c/shared'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type SetupIntent = components['schemas']['SetupIntent']

export default function FoundingPledgePage(): ReactElement {
  const navigate = useNavigate()
  const { user, loading: authLoading, refresh } = useAuth()
  const idempotencyKey = useId().replace(/:/g, '')

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [dropCount, setDropCount] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)
  const [pending, setPending] = useState(false)
  const [setup, setSetup] = useState<SetupIntent | null>(null)
  const [step, setStep] = useState<'form' | 'card'>('form')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/founding/campaign')
        if (!res.ok) {
          if (!cancelled) setLoadError(`Campagna non disponibile (${res.status}).`)
          return
        }
        const json = (await res.json()) as { data: Campaign }
        if (!cancelled) {
          setCampaign(json.data)
          setLoadError(null)
        }
      } catch {
        if (!cancelled) setLoadError('Errore di rete nel caricamento della campagna.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (user) {
      const parts = user.name.trim().split(/\s+/)
      setName(parts[0] ?? user.name)
      setSurname(parts.length > 1 ? parts.slice(1).join(' ') : '')
      setEmail(user.email)
    }
  }, [user])

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    void (async () => {
      const res = await apiFetch('/api/v1/founding/my-reservation')
      if (cancelled || !res.ok) return
      navigate('/sostieni/stato', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, navigate])

  const alreadyPledged =
    typeof error === 'string' && error.toLowerCase().includes('already has a reservation')

  async function startPledge(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setEmailExists(false)
    setPending(true)

    const drops = Number(dropCount)
    if (!Number.isFinite(drops) || drops < 1) {
      setError('Indica almeno 1 quota.')
      setPending(false)
      return
    }

    try {
      if (!user) {
        if (!name.trim() || !surname.trim()) {
          setError('Compila nome e cognome.')
          setPending(false)
          return
        }
        const boot = await apiFetch('/api/v1/founding/bootstrap', {
          method: 'POST',
          json: { name: name.trim(), surname: surname.trim(), email: email.trim() },
        })
        if (boot.status === 409) {
          setEmailExists(true)
          setError('Questa email è già registrata. Accedi per continuare.')
          setPending(false)
          return
        }
        if (!boot.ok) {
          const body = (await boot.json().catch(() => null)) as { message?: string } | null
          setError(body?.message ?? `Registrazione non riuscita (${boot.status}).`)
          setPending(false)
          return
        }
        await refresh()
      }

      const setupRes = await apiFetch('/api/v1/founding/setup-intent', { method: 'POST', json: {} })
      if (!setupRes.ok) {
        const body = (await setupRes.json().catch(() => null)) as { message?: string } | null
        if (setupRes.status === 401) {
          setError('Sessione non valida. Ricarica la pagina o accedi di nuovo.')
          await refresh()
        } else {
          setError(body?.message ?? `Impossibile avviare la verifica carta (${setupRes.status}).`)
        }
        setPending(false)
        return
      }
      const setupJson = (await setupRes.json()) as { data: SetupIntent }
      setSetup(setupJson.data)
      setStep('card')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Richiesta non riuscita.')
    } finally {
      setPending(false)
    }
  }

  async function completePledge(setupIntentId: string): Promise<void> {
    setPending(true)
    setError(null)
    const drops = Number(dropCount)
    const key = `founding-${idempotencyKey}-${drops}`

    try {
      const res = await apiFetch('/api/v1/founding/pledge', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        json: {
          drop_count: drops,
          setup_intent_id: setupIntentId,
          idempotency_key: key,
        },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        if (res.status === 401) {
          setError('Sessione scaduta. Torna indietro e riprova da “Continua con la carta”.')
          setStep('form')
          setSetup(null)
        } else {
          setError(body?.message ?? `Promessa non salvata (${res.status}).`)
        }
        setPending(false)
        return
      }
      navigate('/sostieni/stato', { replace: true, state: { justPledged: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Richiesta non riuscita.')
      setPending(false)
    }
  }

  const dropsNum = Number(dropCount) || 1

  return (
    <SoFuPledgeShell
      title="La tua promessa di quota"
      subtitle="Nessun addebito ora: verifichiamo la carta e registriamo l'impegno. L'incasso avviene solo se la campagna raggiunge il goal."
    >
      {loadError ? <div className="sofu-c-alert sofu-c-alert--error">{loadError}</div> : null}

      {campaign ? <SoFuCampaignCard campaign={campaign} compact /> : null}

      {campaign?.cost_items?.length ? (
        <SoFuCostBreakdown
          items={campaign.cost_items}
          currency={campaign.currency}
          totalCents={campaign.cost_subtotal_cents ?? campaign.total_amount_cents}
        />
      ) : null}

      <div className="sofu-c-form-card">
        {authLoading ? (
          <p className="sofu-c-muted">Caricamento sessione…</p>
        ) : step === 'form' ? (
          <form onSubmit={(e) => void startPledge(e)} className="sofu-c-form-stack">
            <h2 className="sofu-c-form-card__title">I tuoi dati</h2>
            {!user ? (
              <>
                <div className="sofu-c-field">
                  <label htmlFor="pledge-name">Nome</label>
                  <input
                    id="pledge-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="sofu-c-field">
                  <label htmlFor="pledge-surname">Cognome</label>
                  <input
                    id="pledge-surname"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="sofu-c-field">
                  <label htmlFor="pledge-email">Email</label>
                  <input
                    id="pledge-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </>
            ) : (
              <p className="sofu-c-muted">
                Sei connesso come <strong>{user.name}</strong> ({user.email}).{' '}
                <Link to="/sostieni/stato" className="sofu-c-text-link">
                  Vai al tuo impegno
                </Link>
              </p>
            )}

            <div className="sofu-c-field">
              <label htmlFor="pledge-drops">Numero di quote</label>
              <input
                id="pledge-drops"
                type="number"
                min={1}
                max={10000}
                required
                value={dropCount}
                onChange={(e) => setDropCount(e.target.value)}
              />
            </div>

            {campaign ? (
              <p className="sofu-c-muted">
                Impegno stimato ora:{' '}
                <strong>
                  {formatEuro(campaign.current_price_cents * dropsNum, campaign.currency)}
                </strong>{' '}
                (può scendere se arrivano altre quote)
              </p>
            ) : null}

            {error ? (
              <div className="sofu-c-alert sofu-c-alert--error">
                {alreadyPledged ? 'Hai già una promessa attiva per questa campagna.' : error}
                {emailExists ? (
                  <>
                    {' '}
                    <Link to="/login?next=/sostieni" className="sofu-c-text-link">
                      Accedi
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}

            {alreadyPledged ? (
              <Link to="/sostieni/stato" className="sofu-c-cta__submit">
                Vai al tuo impegno
              </Link>
            ) : (
              <button type="submit" className="sofu-c-cta__submit" disabled={pending}>
                {pending ? 'Attendere…' : 'Continua con la carta'}
              </button>
            )}

            {!user ? (
              <p className="sofu-c-muted" style={{ textAlign: 'center' }}>
                Hai già sostenuto?{' '}
                <Link to="/login?next=/sostieni/stato" className="sofu-c-text-link">
                  Accedi al tuo impegno
                </Link>
              </p>
            ) : null}
          </form>
        ) : setup ? (
          <div className="sofu-c-form-stack">
            <h2 className="sofu-c-form-card__title">Verifica la carta</h2>
            <p className="sofu-c-muted">
              Non addebitiamo nulla adesso. Salviamo solo un metodo di pagamento valido per la
              promessa.
            </p>
            {error ? (
              <div className="sofu-c-alert sofu-c-alert--error">
                {alreadyPledged ? 'Hai già una promessa attiva per questa campagna.' : error}
              </div>
            ) : null}
            {alreadyPledged ? (
              <Link to="/sostieni/stato" className="sofu-c-cta__submit">
                Vai al tuo impegno
              </Link>
            ) : (
              <StripeSetupForm
                provider={setup.provider}
                clientSecret={setup.client_secret}
                setupIntentId={setup.setup_intent_id}
                onCompleted={completePledge}
                submitLabel="Conferma e sostieni SoFu"
              />
            )}
            <button
              type="button"
              className="sofu-c-btn-back"
              onClick={() => {
                setStep('form')
                setSetup(null)
                setError(null)
              }}
            >
              Indietro
            </button>
          </div>
        ) : null}
      </div>

      <Link to="/" className="sofu-c-btn-back">
        Torna alla landing
      </Link>
    </SoFuPledgeShell>
  )
}
