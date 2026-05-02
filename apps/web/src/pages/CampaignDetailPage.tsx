import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Divider,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { CampaignCoverImage } from '../components/CampaignCoverImage'
import { CampaignGrowthPlant } from '../components/CampaignGrowthPlant'
import { CampaignMetricsBlock } from '../components/CampaignMetricsBlock'
import { StripePaymentForm } from '../components/StripePaymentForm'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type CampaignWrapped = { data: Campaign }
type Reservation = components['schemas']['Reservation']
type ReservationWrapped = { data: Reservation }
type Payment = components['schemas']['Payment']
type PaymentWrapped = { data: Payment }

const RESERVABLE: string[] = ['published', 'activated']

function reservationNeedsPayment(status: string): boolean {
  return status === 'active'
}

const LIFECYCLE_OK = 'Operazione completata.'

export default function CampaignDetailPage(): ReactElement {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [reserveMsg, setReserveMsg] = useState<string | null>(null)
  const [reservePending, setReservePending] = useState(false)
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null)
  const [payment, setPayment] = useState<Payment | 'pending' | null>(null)
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null)
  const [lifecycleMsg, setLifecycleMsg] = useState<string | null>(null)
  const [lifecyclePending, setLifecyclePending] = useState(false)
  const [syncedReservation, setSyncedReservation] = useState<Reservation | null>(null)

  const paymentJustSucceeded = searchParams.get('payment') === 'success'

  useEffect(() => {
    if (!paymentJustSucceeded) return
    const t = window.setTimeout(() => {
      navigate(`${location.pathname}${location.hash}`, { replace: true })
    }, 8000)
    return () => window.clearTimeout(t)
  }, [paymentJustSucceeded, navigate, location.pathname, location.hash])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch(`/api/v1/campaigns/${encodeURIComponent(slug)}`)
        if (res.status === 404 || res.status === 403) {
          if (!cancelled) setError('Campagna non disponibile.')
          return
        }
        if (!res.ok) {
          if (!cancelled) setError(`Impossibile caricare la campagna (${res.status}).`)
          return
        }
        const json = (await res.json()) as CampaignWrapped
        if (!cancelled) {
          setCampaign(json.data)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Errore di rete.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, reloadTick])

  useEffect(() => {
    if (!user?.id || !campaign?.id) {
      queueMicrotask(() => setSyncedReservation(null))
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch(`/api/v1/me/reservations?page=1&per_page=50`)
        if (!res.ok || cancelled) return
        const json = (await res.json()) as { data: Reservation[] }
        const row = json.data.find((r) => r.campaign_id === campaign.id)
        if (!cancelled) setSyncedReservation(row ?? null)
      } catch {
        if (!cancelled) setSyncedReservation(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, campaign?.id, reloadTick])

  const effectiveReservation: Reservation | null =
    lastReservation && syncedReservation && lastReservation.id === syncedReservation.id
      ? syncedReservation
      : (lastReservation ?? syncedReservation)

  const isOwner = user !== null && campaign !== null && user.id === campaign.creator_id
  const isBackoffice = user?.role === 'operator' || user?.role === 'admin'
  const canReserve = campaign !== null && RESERVABLE.includes(campaign.status)

  async function runLifecycle(url: string): Promise<void> {
    setLifecycleMsg(null)
    setLifecyclePending(true)
    try {
      const res = await apiFetch(url, { method: 'POST', json: {} })
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
      }
      if (
        res.status === 409 &&
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof (body as { error: { message?: string } }).error?.message === 'string'
      ) {
        setLifecycleMsg((body as { error: { message: string } }).error.message)
        return
      }
      if (!res.ok) {
        setLifecycleMsg(`Azione non riuscita (${res.status}).`)
        return
      }
      setReloadTick((t) => t + 1)
      setLifecycleMsg(LIFECYCLE_OK)
    } catch {
      setLifecycleMsg('Errore di rete.')
    } finally {
      setLifecyclePending(false)
    }
  }

  async function onReserve(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!slug || !user || !canReserve) return
    setReserveMsg(null)
    setPayment(null)
    setPaymentMsg(null)
    setReservePending(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await apiFetch(`/api/v1/campaigns/${encodeURIComponent(slug)}/reservations`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        json: { idempotency_key: idempotencyKey },
      })
      const body = await res.json().catch(() => null)
      if (res.status === 401) {
        setReserveMsg('Accedi per prenotare.')
        return
      }
      if (res.status === 409) {
        const msg =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: string }).message)
            : 'Non è stato possibile completare la prenotazione.'
        setReserveMsg(msg)
        return
      }
      if (res.status === 422) {
        setReserveMsg('Errore di validazione (chiave idempotenza richiesta).')
        return
      }
      if (!res.ok) {
        setReserveMsg(`Operazione non riuscita (${res.status}).`)
        return
      }
      const json = body as ReservationWrapped
      setLastReservation(json.data)
      setReserveMsg(
        `Prenotazione effettuata. Quota effettiva: ${formatEuro(json.data.effective_price_cents, campaign?.currency ?? 'EUR')}.`,
      )
      setReloadTick((t) => t + 1)
    } catch {
      setReserveMsg('Errore di rete.')
    } finally {
      setReservePending(false)
    }
  }

  async function onPaymentIntent(): Promise<void> {
    const resv = effectiveReservation
    if (!resv || !reservationNeedsPayment(resv.status)) return
    setPayment('pending')
    setPaymentMsg(null)
    try {
      const res = await apiFetch(`/api/v1/reservations/${resv.id}/payment-intent`, {
        method: 'POST',
        json: {},
      })
      const raw = await res.text()
      let parsed: PaymentWrapped | null = null
      try {
        parsed = raw === '' ? null : (JSON.parse(raw) as PaymentWrapped)
      } catch {
        parsed = null
      }
      if (!res.ok || !parsed?.data) {
        setPayment(null)
        setPaymentMsg(`Creazione pagamento non riuscita (${res.status}).`)
        return
      }
      setPayment(parsed.data)
      setPaymentMsg(
        parsed.data.provider === 'mock'
          ? 'Intent di pagamento mock creato.'
          : 'Completa il pagamento qui sotto (carta di test: 4242 4242 4242 4242).',
      )
    } catch {
      setPayment(null)
      setPaymentMsg('Errore di rete.')
    }
  }

  if (error) {
    return (
      <Stack gap="md" py="md">
        <Alert color="red" title="Errore">
          {error}
        </Alert>
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          ← Torna alle campagne
        </Anchor>
      </Stack>
    )
  }

  if (!campaign) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={280} radius="lg" />
        <Skeleton height={24} width="40%" />
        <Skeleton height={120} />
        <Skeleton height={200} />
      </Stack>
    )
  }

  const s = encodeURIComponent(campaign.slug)
  const cat = campaignCategoryLabel(campaign.category)
  const costRows = [...(campaign.cost_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const reserveOk = reserveMsg?.startsWith('Prenotazione effettuata') ?? false

  return (
    <Stack gap="xl" py={{ base: 'md', sm: 'lg' }} pb="xl">
      <Breadcrumbs>
        <Anchor component={Link} to="/campaigns" size="sm">
          Campagne
        </Anchor>
        <Text size="sm" c="dimmed" lineClamp={1}>
          {campaign.title}
        </Text>
      </Breadcrumbs>

      <Paper withBorder radius="lg" shadow="sm" p={0} style={{ overflow: 'hidden' }}>
        <Box pos="relative">
          <CampaignCoverImage slug={campaign.slug} title={campaign.title} height={300} />
          <Box
            pos="absolute"
            inset={0}
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />
          <Stack
            gap="sm"
            pos="absolute"
            left={0}
            right={0}
            bottom={0}
            p={{ base: 'md', sm: 'xl' }}
            style={{ pointerEvents: 'none' }}
          >
            <Group gap="xs" wrap="wrap">
              <Badge variant="filled" color={campaignStatusBadgeColor(campaign.status)} size="lg" tt="none" fw={600}>
                {campaignStatusLabel(campaign.status)}
              </Badge>
              {cat ? (
                <Badge
                  variant="outline"
                  size="lg"
                  tt="none"
                  styles={{
                    root: {
                      borderColor: 'rgba(255,255,255,0.55)',
                      color: 'white',
                      backgroundColor: 'rgba(255,255,255,0.12)',
                    },
                  }}
                >
                  {cat}
                </Badge>
              ) : null}
              <Text size="xs" c="white" opacity={0.9} fw={600} style={{ marginLeft: 'auto' }}>
                {campaign.currency}
              </Text>
            </Group>
            <Title order={2} c="white" style={{ letterSpacing: '-0.03em', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
              {campaign.title}
            </Title>
          </Stack>
        </Box>

        <Stack gap="lg" p={{ base: 'md', sm: 'xl' }}>
          {campaign.summary?.trim() ? (
            <Text size="lg" c="dimmed" lh={1.6} fw={500}>
              {campaign.summary.trim()}
            </Text>
          ) : null}

          <CampaignGrowthPlant
            progressPercent={supporterProgressPercent(campaign)}
            variant="featured"
            projectLabel="progetto"
          />

          <CampaignMetricsBlock c={campaign} />

          {campaign.description?.trim() ? (
            <>
              <Divider label="Dettagli" labelPosition="left" />
              <div>
                <Title order={4} mb="sm" style={{ letterSpacing: '-0.02em' }}>
                  Descrizione
                </Title>
                <Text size="sm" c="dark" lh={1.75} style={{ whiteSpace: 'pre-wrap' }}>
                  {campaign.description.trim()}
                </Text>
              </div>
            </>
          ) : null}

          {costRows.length > 0 ? (
            <>
              <Divider label="Voci di costo" labelPosition="left" />
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Voce</Table.Th>
                    <Table.Th style={{ textAlign: 'right', width: '9rem' }}>Importo</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {costRows.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>{row.label}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatEuro(row.amount_cents, campaign.currency)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          ) : null}
        </Stack>
      </Paper>

      {(isOwner || isBackoffice) && (
        <Paper withBorder radius="lg" p={{ base: 'md', sm: 'lg' }} shadow="sm">
          <Title order={4} mb="md" style={{ letterSpacing: '-0.02em' }}>
            Gestione campagna
          </Title>
          <Stack gap="sm">
            {isOwner && campaign.status === 'draft' ? (
              <Button
                type="button"
                loading={lifecyclePending}
                onClick={() => void runLifecycle(`/api/v1/campaigns/${s}/submit-for-review`)}
                variant="light"
              >
                Invia in revisione
              </Button>
            ) : null}
            {isOwner && campaign.status === 'approved' ? (
              <Button
                type="button"
                loading={lifecyclePending}
                onClick={() => void runLifecycle(`/api/v1/campaigns/${s}/publish`)}
                color="teal"
              >
                Pubblica
              </Button>
            ) : null}
            {isBackoffice && campaign.status === 'submitted_for_review' ? (
              <Group gap="sm" wrap="wrap">
                <Button
                  type="button"
                  loading={lifecyclePending}
                  onClick={() => void runLifecycle(`/api/v1/backoffice/campaigns/${s}/approve`)}
                  color="teal"
                >
                  Approva
                </Button>
                <Button
                  type="button"
                  loading={lifecyclePending}
                  onClick={() => void runLifecycle(`/api/v1/backoffice/campaigns/${s}/reject`)}
                  variant="outline"
                  color="red"
                >
                  Rifiuta
                </Button>
              </Group>
            ) : null}
            {lifecycleMsg ? (
              <Alert color={lifecycleMsg === LIFECYCLE_OK ? 'teal' : 'red'} variant="light">
                {lifecycleMsg}
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      )}

      <Paper withBorder radius="lg" p={{ base: 'md', sm: 'lg' }} shadow="sm">
        <Title order={4} mb="md" style={{ letterSpacing: '-0.02em' }}>
          La tua partecipazione
        </Title>
        {user ? (
          <Stack gap="md">
            {canReserve ? (
              <form onSubmit={(e) => void onReserve(e)}>
                <Stack gap="sm" align="flex-start">
                  <Button type="submit" loading={reservePending} color="teal" size="md">
                    Prenota un posto
                  </Button>
                  {reserveMsg ? (
                    <Alert color={reserveOk ? 'teal' : 'red'} variant="light">
                      {reserveMsg}
                    </Alert>
                  ) : null}
                </Stack>
              </form>
            ) : (
              <Text size="sm" c="dimmed">
                Le prenotazioni sono aperte quando la campagna è pubblicata o attiva.
              </Text>
            )}

            {effectiveReservation ? (
              <Stack gap="md" pt="sm">
                <Divider />
                <div>
                  <Title order={5} mb="xs">
                    Pagamento
                  </Title>
                  {paymentJustSucceeded ? (
                    <Alert color="teal" mb="sm" title="Grazie!">
                      Pagamento registrato correttamente.
                    </Alert>
                  ) : null}
                  <Text size="sm" c="dimmed" mb="sm">
                    Prenotazione #{effectiveReservation.id}
                  </Text>
                  {effectiveReservation.status === 'converted_to_payment' ? (
                    <Alert color="teal" variant="light">
                      Pagamento completato per questa prenotazione.
                    </Alert>
                  ) : effectiveReservation.status === 'failed' ? (
                    <Alert color="red" variant="light">
                      Pagamento non riuscito. Puoi riprovare preparando di nuovo il pagamento.
                    </Alert>
                  ) : reservationNeedsPayment(effectiveReservation.status) ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => void onPaymentIntent()}
                        loading={payment === 'pending'}
                        mb="sm"
                      >
                        Prepara pagamento
                      </Button>
                      {paymentMsg ? (
                        <Alert
                          mb="sm"
                          color={
                            paymentMsg.includes('non riuscita') || paymentMsg.includes('Errore di rete')
                              ? 'red'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {paymentMsg}
                        </Alert>
                      ) : null}
                      {payment && payment !== 'pending' ? (
                        <Stack gap="sm">
                          <Text size="sm" c="dimmed">
                            Stato intent: <strong>{payment.status}</strong> —{' '}
                            {formatEuro(payment.amount_cents, payment.currency)}
                          </Text>
                          <StripePaymentForm
                            payment={payment}
                            returnNextPath={`/campaigns/${encodeURIComponent(campaign.slug)}`}
                            onCompleted={() => {
                              setPaymentMsg('Pagamento inviato. Aggiornamento stato…')
                              setReloadTick((t) => t + 1)
                              window.setTimeout(() => setReloadTick((t) => t + 1), 1200)
                              navigate(`/campaigns/${encodeURIComponent(campaign.slug)}?payment=success`, {
                                replace: true,
                              })
                            }}
                          />
                        </Stack>
                      ) : null}
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Nessun pagamento richiesto per lo stato attuale della prenotazione.
                    </Text>
                  )}
                </div>
              </Stack>
            ) : null}
          </Stack>
        ) : (
          <Text size="sm">
            <Anchor component={Link} to="/login" fw={600}>
              Accedi
            </Anchor>{' '}
            per prenotare un posto.
          </Text>
        )}
      </Paper>

      {isOwner ? (
        <Text size="xs" c="dimmed" ta="center">
          <Anchor component={Link} to="/me/campaigns" size="xs">
            Le mie campagne
          </Anchor>
        </Text>
      ) : null}
    </Stack>
  )
}
