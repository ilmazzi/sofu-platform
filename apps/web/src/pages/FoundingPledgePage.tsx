import { type FormEvent, type ReactElement, useEffect, useId, useState } from 'react'
import { Alert, Box, Button, NumberInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconCreditCard, IconUser } from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { StripeSetupForm } from '../components/StripeSetupForm'
import { useAuth } from '../context/AuthContext'
import { FoundingBrand } from '../founding/FoundingBrand'
import { FoundingCampaignPulse } from '../founding/FoundingCampaignPulse'
import { FoundingCostBreakdown } from '../founding/FoundingCostBreakdown'
import { FoundingShell } from '../founding/FoundingShell'
import { founding } from '../founding/theme'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type SetupIntent = components['schemas']['SetupIntent']

const { cream, ink, fontDisplay, fontBody } = founding

export default function FoundingPledgePage(): ReactElement {
  const navigate = useNavigate()
  const { user, loading: authLoading, refresh } = useAuth()
  const idempotencyKey = useId().replace(/:/g, '')

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [dropCount, setDropCount] = useState<number | string>(1)
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

  // Chi ha già una promessa non ripassa da verifica carta: va allo stato.
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

    const drops = typeof dropCount === 'number' ? dropCount : Number(dropCount)
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
    const drops = typeof dropCount === 'number' ? dropCount : Number(dropCount)
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

  return (
    <FoundingShell>
        <Stack gap="lg">
          <Stack gap="xs" ta="center" className="founding-fade-up">
            <Box className="founding-float">
              <FoundingBrand size="md" />
            </Box>
            <Title
              order={1}
              c={cream}
              fz={{ base: '1.45rem', sm: '1.85rem' }}
              fw={650}
              className="founding-fade-up founding-fade-up-delay-1"
              style={{ letterSpacing: '-0.02em', fontFamily: fontDisplay }}
            >
              La tua promessa di quota
            </Title>
            <Text
              c={cream}
              size="sm"
              maw={520}
              mx="auto"
              className="founding-fade-up founding-fade-up-delay-2"
              style={{ opacity: 0.9, fontFamily: fontBody }}
            >
              Nessun addebito ora: verifichiamo la carta e registriamo l&apos;impegno. L&apos;incasso avviene solo se la
              campagna raggiunge il goal.
            </Text>
          </Stack>

          {loadError ? (
            <Alert color="red" variant="filled">
              {loadError}
            </Alert>
          ) : null}

          {campaign ? <FoundingCampaignPulse campaign={campaign} /> : null}

          {campaign?.cost_items?.length ? (
            <Box
              p={{ base: 'lg', sm: 'xl' }}
              style={{
                background: cream,
                borderRadius: 24,
                color: ink,
                boxShadow: '0 18px 40px rgba(8, 40, 52, 0.16)',
              }}
            >
              <FoundingCostBreakdown
                items={campaign.cost_items}
                currency={campaign.currency}
                totalCents={campaign.cost_subtotal_cents ?? campaign.total_amount_cents}
              />
            </Box>
          ) : null}

          <Box
            p={{ base: 'lg', sm: 'xl' }}
            style={{
              background: cream,
              borderRadius: 24,
              color: ink,
              boxShadow: '0 18px 40px rgba(8, 40, 52, 0.16)',
              animation: 'foundingFadeUp 0.55s ease 0.05s both',
            }}
          >
            {authLoading ? (
              <Text size="sm" style={{ fontFamily: fontBody }}>
                Caricamento sessione…
              </Text>
            ) : step === 'form' ? (
              <form onSubmit={(e) => void startPledge(e)}>
                <Stack gap="md">
                  <Title order={2} fz="1.35rem" c={ink} style={{ fontFamily: fontDisplay }}>
                    <Box component="span" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <IconUser size={22} stroke={1.7} />
                      I tuoi dati
                    </Box>
                  </Title>
                  {!user ? (
                    <>
                      <TextInput
                        label="Nome"
                        required
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Cognome"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                      />
                    </>
                  ) : (
                    <Stack gap={4}>
                      <Text size="sm">
                        Sei connesso come <strong>{user.name}</strong> ({user.email}).
                      </Text>
                      <Text size="sm">
                        <Link to="/sostieni/stato">Hai già sostenuto? Vai al tuo impegno</Link>
                      </Text>
                    </Stack>
                  )}
                  <NumberInput
                    label="Numero di quote"
                    min={1}
                    max={10000}
                    value={dropCount}
                    onChange={setDropCount}
                    required
                  />
                  {campaign ? (
                    <Text size="sm" c="dimmed">
                      Impegno stimato ora:{' '}
                      <strong>
                        {formatEuro(
                          campaign.current_price_cents *
                            (typeof dropCount === 'number' ? dropCount : Number(dropCount) || 1),
                          campaign.currency,
                        )}
                      </strong>{' '}
                      (può scendere se arrivano altre quote)
                    </Text>
                  ) : null}
                  {error ? (
                    <Alert color="red" variant="light">
                      {alreadyPledged
                        ? 'Hai già una promessa attiva per questa campagna.'
                        : error}
                      {emailExists ? (
                        <>
                          {' '}
                          <Link to="/login?next=/sostieni">Accedi</Link>
                        </>
                      ) : null}
                    </Alert>
                  ) : null}
                  {alreadyPledged ? (
                    <Button component={Link} to="/sostieni/stato" color="dark" size="md" fullWidth>
                      Vai al tuo impegno
                    </Button>
                  ) : (
                    <Button type="submit" color="dark" size="md" fullWidth loading={pending}>
                      Continua con la carta
                    </Button>
                  )}
                  {!user ? (
                    <Text size="sm" ta="center" c="dimmed">
                      Hai già sostenuto?{' '}
                      <Link to="/login?next=/sostieni/stato">Accedi al tuo impegno</Link>
                    </Text>
                  ) : null}
                </Stack>
              </form>
            ) : setup ? (
              <Stack gap="md">
                <Title order={2} fz="1.35rem" c={ink} style={{ fontFamily: fontDisplay }}>
                  <Box component="span" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <IconCreditCard size={22} stroke={1.7} />
                    Verifica la carta
                  </Box>
                </Title>
                <Text size="sm">
                  Non addebitiamo nulla adesso. Salviamo solo un metodo di pagamento valido per la promessa.
                </Text>
                {error ? (
                  <Alert color="red" variant="light">
                    {alreadyPledged
                      ? 'Hai già una promessa attiva per questa campagna.'
                      : error}
                  </Alert>
                ) : null}
                {alreadyPledged ? (
                  <Button component={Link} to="/sostieni/stato" color="dark" size="md" fullWidth>
                    Vai al tuo impegno
                  </Button>
                ) : (
                  <StripeSetupForm
                    provider={setup.provider}
                    clientSecret={setup.client_secret}
                    setupIntentId={setup.setup_intent_id}
                    onCompleted={completePledge}
                    submitLabel="Conferma e sostieni SoFu"
                  />
                )}
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setStep('form')
                    setSetup(null)
                    setError(null)
                  }}
                >
                  Indietro
                </Button>
              </Stack>
            ) : null}
          </Box>

          <Button
            component={Link}
            to="/"
            variant="subtle"
            fullWidth
            styles={{
              root: {
                color: cream,
                fontFamily: fontBody,
                fontWeight: 600,
                background: 'transparent',
                '&:hover': {
                  background: 'rgba(247,241,230,0.14)',
                  color: cream,
                },
              },
            }}
          >
            Torna alla landing
          </Button>
        </Stack>
    </FoundingShell>
  )
}
