import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  FileInput,
  Grid,
  Group,
  Progress,
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
import { apiFetch, apiFetchForm } from '../lib/api/client'
import {
  campaignBloomProgressPercent,
  campaignHasReachedBloom,
  reservationBlocksNewDroplet,
  reservationEligibleForPayment,
} from '../lib/bloom'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type CampaignWrapped = { data: Campaign }
type Reservation = components['schemas']['Reservation']
type ReservationWrapped = { data: Reservation }
type Payment = components['schemas']['Payment']
type PaymentWrapped = { data: Payment }

const RESERVABLE: string[] = ['published', 'activated']

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
  const [draftGalleryFiles, setDraftGalleryFiles] = useState<File[]>([])
  const [draftGalleryPending, setDraftGalleryPending] = useState(false)
  const [draftGalleryMsg, setDraftGalleryMsg] = useState<string | null>(null)
  const [cancelPending, setCancelPending] = useState(false)
  const [cancelMsg, setCancelMsg] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)

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
  const ownerPreview =
    isOwner &&
    campaign !== null &&
    ['draft', 'submitted_for_review', 'approved', 'rejected'].includes(campaign.status)
  const canUploadGallery =
    isOwner &&
    campaign !== null &&
    (campaign.status === 'draft' || campaign.status === 'approved')

  async function uploadDraftGallery(): Promise<void> {
    if (!campaign || draftGalleryFiles.length === 0 || !canUploadGallery) return
    setDraftGalleryMsg(null)
    setDraftGalleryPending(true)
    try {
      const fd = new FormData()
      for (const file of draftGalleryFiles) {
        fd.append('images[]', file)
      }
      const res = await apiFetchForm(`/api/v1/campaigns/${encodeURIComponent(campaign.slug)}/media`, fd)
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
      }
      if (res.status === 422 && body && typeof body === 'object' && 'errors' in body) {
        const errors = (body as { errors: Record<string, string[]> }).errors
        setDraftGalleryMsg(Object.values(errors).flat()[0] ?? 'Caricamento non valido.')
        return
      }
      if (!res.ok) {
        setDraftGalleryMsg(`Caricamento non riuscito (${res.status}).`)
        return
      }
      setDraftGalleryFiles([])
      setReloadTick((t) => t + 1)
      setDraftGalleryMsg('Immagini aggiornate.')
    } catch {
      setDraftGalleryMsg('Errore di rete.')
    } finally {
      setDraftGalleryPending(false)
    }
  }

  async function onDeleteCampaign(): Promise<void> {
    if (!campaign || !window.confirm('Eliminare definitivamente questa campagna? L’azione non è reversibile.')) {
      return
    }
    setLifecycleMsg(null)
    setDeletePending(true)
    try {
      const res = await apiFetch(`/api/v1/campaigns/${encodeURIComponent(campaign.slug)}`, {
        method: 'DELETE',
        json: {},
      })
      if (!res.ok) {
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
        setLifecycleMsg(`Eliminazione non riuscita (${res.status}).`)
        return
      }
      navigate('/me/campaigns', { replace: true })
    } catch {
      setLifecycleMsg('Errore di rete.')
    } finally {
      setDeletePending(false)
    }
  }

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
      if (res.status === 422 && body && typeof body === 'object' && 'errors' in body) {
        const errors = (body as { errors: Record<string, string[]> }).errors
        setLifecycleMsg(Object.values(errors).flat()[0] ?? 'Dati non validi.')
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
        setReserveMsg('Accedi per aggiungere un droplet.')
        return
      }
      if (res.status === 409) {
        const msg =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: string }).message)
            : 'Non è stato possibile completare l\'operazione.'
        setReserveMsg(msg)
        return
      }
      if (res.status === 422) {
        setReserveMsg('Errore di validazione.')
        return
      }
      if (!res.ok) {
        setReserveMsg(`Operazione non riuscita (${res.status}).`)
        return
      }
      const json = body as ReservationWrapped
      setLastReservation(json.data)
      setReserveMsg(
        `Drop inserita nell’annaffiatoio. Quota di riferimento: ${formatEuro(json.data.effective_price_cents, campaign?.currency ?? 'EUR')}. Nessun addebito immediato: fino al Bloom il valore della tua quota resta questo; l’incasso avviene solo quando le regole della campagna lo consentono (non al solo clic).`,
      )
      setReloadTick((t) => t + 1)
    } catch {
      setReserveMsg('Errore di rete.')
    } finally {
      setReservePending(false)
    }
  }

  async function onCancelReservation(): Promise<void> {
    const resv = effectiveReservation
    if (!resv || resv.status !== 'active' || !campaign || campaignHasReachedBloom(campaign)) {
      return
    }
    setCancelMsg(null)
    setCancelPending(true)
    try {
      const res = await apiFetch(`/api/v1/reservations/${resv.id}`, {
        method: 'DELETE',
        json: {},
      })
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
        setCancelMsg((body as { error: { message: string } }).error.message)
        return
      }
      if (!res.ok) {
        setCancelMsg(`Ritiro non riuscito (${res.status}).`)
        return
      }
      setLastReservation(null)
      setReserveMsg(null)
      setReloadTick((t) => t + 1)
    } catch {
      setCancelMsg('Errore di rete.')
    } finally {
      setCancelPending(false)
    }
  }

  async function onPaymentIntent(): Promise<void> {
    const resv = effectiveReservation
    if (!resv || !campaign || !reservationEligibleForPayment(resv.status, campaignHasReachedBloom(campaign))) return
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
      if (res.status === 422) {
        setPayment(null)
        const msg =
          parsed && typeof parsed === 'object' && 'message' in parsed
            ? String((parsed as { message: string }).message)
            : 'Operazione non consentita.'
        setPaymentMsg(msg)
        return
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
        <Skeleton height={400} />
        <Skeleton height={24} width="40%" />
        <Skeleton height={120} />
        <Skeleton height={200} />
      </Stack>
    )
  }

  const s = encodeURIComponent(campaign.slug)
  const cat = campaignCategoryLabel(campaign.category)
  const costRows = [...(campaign.cost_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const reserveOk = reserveMsg?.includes('annaffiatoio') ?? false
  const bloomed = campaignHasReachedBloom(campaign)
  const bloomPct = campaignBloomProgressPercent(campaign)
  const showAddDroplet =
    canReserve &&
    (effectiveReservation === null || !reservationBlocksNewDroplet(effectiveReservation.status))
  const canWithdrawDroplet = effectiveReservation?.status === 'active' && !bloomed
  const canPayDroplet =
    effectiveReservation !== null &&
    reservationEligibleForPayment(effectiveReservation.status, bloomed)

  return (
    <Box py="md">
      {/* Breadcrumb */}
      <Group gap="xs" mb="lg">
        <Anchor component={Link} to="/campaigns" size="sm" c="dimmed" fw={500}>
          Campagne
        </Anchor>
        <Text size="sm" c="dimmed">
          /
        </Text>
        <Text size="sm" c="dark" fw={500} lineClamp={1}>
          {campaign.title}
        </Text>
      </Group>

      <Grid>
        {/* Colonna principale */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="xl">
            {/* Hero image */}
            <Box pos="relative" style={{ border: '1px solid #dee2e6' }}>
              <CampaignCoverImage slug={campaign.slug} title={campaign.title} mediaUrls={campaign.media_urls} height={400} />
              <Box
                pos="absolute"
                inset={0}
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                  pointerEvents: 'none',
                }}
              />
              <Stack
                gap="sm"
                pos="absolute"
                left={0}
                right={0}
                bottom={0}
                p="xl"
                style={{ pointerEvents: 'none' }}
              >
                <Group gap="xs" wrap="wrap">
                  <Badge 
                    variant="filled" 
                    color={campaignStatusBadgeColor(campaign.status)} 
                    size="sm" 
                    tt="uppercase"
                    style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.65rem' }}
                  >
                    {campaignStatusLabel(campaign.status)}
                  </Badge>
                  {cat ? (
                    <Badge
                      variant="outline"
                      size="sm"
                      tt="uppercase"
                      style={{
                        borderColor: 'rgba(255,255,255,0.8)',
                        color: 'white',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        fontSize: '0.65rem'
                      }}
                    >
                      {cat}
                    </Badge>
                  ) : null}
                  {!ownerPreview ? (
                    <Text size="xs" c="white" opacity={0.9} fw={600} style={{ marginLeft: 'auto' }}>
                      {campaign.currency}
                    </Text>
                  ) : null}
                </Group>
                <Title order={1} c="white" fw={600} style={{ letterSpacing: '-0.03em', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
                  {campaign.title}
                </Title>
              </Stack>
            </Box>

            {/* Summary */}
            {campaign.summary?.trim() ? (
              <Text size="lg" c="dimmed" lh={1.7} fw={400}>
                {campaign.summary.trim()}
              </Text>
            ) : null}

            {/* Piantina */}
            <CampaignGrowthPlant
              progressPercent={supporterProgressPercent(campaign)}
              variant={ownerPreview ? 'creatorSeed' : 'featured'}
              projectLabel="progetto"
            />

            {/* Descrizione */}
            {campaign.description?.trim() ? (
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="sm">
                  Descrizione
                </Text>
                <Text size="sm" c="dark" lh={1.75} style={{ whiteSpace: 'pre-wrap' }}>
                  {campaign.description.trim()}
                </Text>
              </Box>
            ) : null}

            {/* Voci di costo */}
            {costRows.length > 0 ? (
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="sm">
                  Voci di costo
                </Text>
                <Table
                  striped
                  highlightOnHover
                  style={{
                    border: '1px solid #dee2e6',
                  }}
                  styles={{
                    th: {
                      backgroundColor: '#f8f9fa',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#495057',
                    },
                  }}
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Voce</Table.Th>
                      <Table.Th style={{ textAlign: 'right', width: '9rem' }}>Importo</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {costRows.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td style={{ fontWeight: 500 }}>{row.label}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatEuro(row.amount_cents, campaign.currency)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            ) : null}
          </Stack>
        </Grid.Col>

        {/* Sidebar destra */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Box
            style={{
              position: 'sticky',
              top: 16,
            }}
          >
            <Stack gap="lg">
              {/* Metriche */}
              <Box
                p="lg"
                style={{
                  border: '1px solid #dee2e6',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <CampaignMetricsBlock c={campaign} compact creatorPreview={ownerPreview} />
              </Box>

              {/* Azioni utente / anteprima creatore */}
              <Box
                p="lg"
                style={{
                  border: '1px solid #dee2e6',
                }}
              >
                {ownerPreview ? (
                  <Alert color="yellow" title="Attenzione" variant="light">
                    <Text size="sm" lh={1.6}>
                      Controlla che tutti i campi siano corretti e che le cifre corrispondano alle tue necessità.
                      Dopo l’invio in revisione, SoFu verificherà che il contenuto rispetti le linee guida, non includa
                      materiale illegale e sia coerente. Una volta approvata, potrai ancora modificare la campagna prima
                      della pubblicazione; le modifiche potranno essere notificate e sono passibili di veto o blocco.
                    </Text>
                  </Alert>
                ) : (
                  <>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="md">
                      Partecipa
                    </Text>
                    {user ? (
                  <Stack gap="md">
                    {canReserve ? (
                      showAddDroplet ? (
                        <form onSubmit={(e) => void onReserve(e)}>
                          <Stack gap="sm">
                            <Button
                              type="submit"
                              loading={reservePending}
                              color="dark"
                              size="md"
                              fullWidth
                              style={{
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                              }}
                            >
                              💧 Aggiungi droplet
                            </Button>
                            {reserveMsg ? (
                              <Alert color={reserveOk ? 'teal' : 'red'} variant="light" p="sm">
                                <Text size="xs">{reserveMsg}</Text>
                              </Alert>
                            ) : null}
                          </Stack>
                        </form>
                      ) : null
                    ) : (
                      <Text size="sm" c="dimmed" fw={400}>
                        I droplets sono aperti quando la campagna è pubblicata o attiva.
                      </Text>
                    )}

                    {effectiveReservation ? (
                      <Box pt="sm" style={{ borderTop: '1px solid #dee2e6' }}>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="sm">
                          Il tuo droplet
                        </Text>
                        <Text size="xs" c="dimmed" mb="sm">
                          #{effectiveReservation.id}
                        </Text>
                        {effectiveReservation.status === 'converted_to_payment' ? (
                          <Alert color="teal" variant="light" p="sm" title="In bloom!">
                            <Text size="xs">Pagamento completato — la tua drop ha fatto la differenza.</Text>
                          </Alert>
                        ) : null}

                        {(effectiveReservation.status === 'active' || effectiveReservation.status === 'failed') &&
                        !bloomed ? (
                          <Stack gap="sm">
                            <Alert color="blue" variant="light" p="sm" title="Drop inserita nell’annaffiatoio">
                              <Text size="xs">
                                Nessun addebito ancora: è un impegno sull’offerta. Fino al Bloom il valore della tua quota resta quello indicato; dopo il Bloom può scendere verso il minimo fino a Full bloom o chiusura. L’incasso non coincide con la sola adesione.
                              </Text>
                            </Alert>
                            <Text size="xs" fw={600}>
                              Verso il Bloom
                            </Text>
                            <Progress value={bloomPct} size="sm" radius="xl" color="teal" />
                            <Text size="xs" c="dimmed">
                              {Math.round(bloomPct)}% — {campaign.active_reservations_count} / {campaign.target_supporters}{' '}
                              quote Bloom (posti)
                            </Text>
                            <Text size="xs" c="dimmed">
                              Quota di riferimento:{' '}
                              <Text span fw={700} c="dark">
                                {formatEuro(effectiveReservation.effective_price_cents, campaign.currency)}
                              </Text>
                            </Text>
                            {canWithdrawDroplet ? (
                              <Stack gap="xs" mt="xs">
                                <Button
                                  type="button"
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  loading={cancelPending}
                                  onClick={() => void onCancelReservation()}
                                  style={{ alignSelf: 'flex-start' }}
                                >
                                  Ritira la drop
                                </Button>
                                {cancelMsg ? (
                                  <Alert color="red" variant="light" p="sm">
                                    <Text size="xs">{cancelMsg}</Text>
                                  </Alert>
                                ) : null}
                              </Stack>
                            ) : null}
                          </Stack>
                        ) : null}

                        {effectiveReservation.status === 'active' && bloomed ? (
                          <Stack gap="sm">
                            <Alert color="teal" variant="light" p="sm" title="Bloom raggiunto">
                              <Text size="xs">
                                Il valore della tua Drop può ancora aggiornarsi al ribasso fino a Full bloom o fine campagna.
                                Qui sotto, quando disponibile, confermi il contributo sull’importo dovuto in quel momento.
                              </Text>
                            </Alert>
                            <Text size="xs">
                              Importo attuale della tua Drop:{' '}
                              <Text span fw={700}>
                                {formatEuro(effectiveReservation.effective_price_cents, campaign.currency)}
                              </Text>
                              .
                            </Text>
                          </Stack>
                        ) : null}

                        {effectiveReservation.status === 'failed' && bloomed ? (
                          <Stack gap="sm">
                            <Alert color="red" variant="light" p="sm">
                              <Text size="xs">Pagamento non riuscito — riprova qui sotto.</Text>
                            </Alert>
                            <Text size="xs">
                              Importo attuale della tua Drop:{' '}
                              <Text span fw={700}>
                                {formatEuro(effectiveReservation.effective_price_cents, campaign.currency)}
                              </Text>
                              .
                            </Text>
                          </Stack>
                        ) : null}

                        {canPayDroplet &&
                        effectiveReservation.status !== 'converted_to_payment' &&
                        effectiveReservation.status !== 'cancelled' &&
                        effectiveReservation.status !== 'expired' ? (
                          <Stack gap="sm" mt="sm">
                            <Text size="xs" c="dimmed" lh={1.5}>
                              Confermi sull’importo della Drop indicato dal sistema al momento dell’incasso (dopo il Bloom
                              può ancora variare fino a conclusione campagna).
                            </Text>
                            <Button
                              type="button"
                              onClick={() => void onPaymentIntent()}
                              loading={payment === 'pending'}
                              variant="outline"
                              color="dark"
                              size="sm"
                              fullWidth
                              style={{
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                fontSize: '0.65rem',
                              }}
                            >
                              Conferma il contributo
                            </Button>
                            {paymentMsg ? (
                              <Alert
                                color={
                                  paymentMsg.includes('non riuscita') ||
                                  paymentMsg.includes('Errore') ||
                                  paymentMsg.includes('Bloom')
                                    ? 'red'
                                    : 'gray'
                                }
                                variant="light"
                                p="sm"
                              >
                                <Text size="xs">{paymentMsg}</Text>
                              </Alert>
                            ) : null}
                            {payment && payment !== 'pending' ? (
                              <Stack gap="sm">
                                <Text size="xs" c="dimmed">
                                  Stato: <strong>{payment.status}</strong> —{' '}
                                  {formatEuro(payment.amount_cents, payment.currency)}
                                </Text>
                                <StripePaymentForm
                                  payment={payment}
                                  returnNextPath={`/campaigns/${encodeURIComponent(campaign.slug)}`}
                                  onCompleted={() => {
                                    setPaymentMsg('Pagamento inviato.')
                                    setReloadTick((t) => t + 1)
                                    window.setTimeout(() => setReloadTick((t) => t + 1), 1200)
                                    navigate(`/campaigns/${encodeURIComponent(campaign.slug)}?payment=success`, {
                                      replace: true,
                                    })
                                  }}
                                />
                              </Stack>
                            ) : null}
                          </Stack>
                        ) : null}
                      </Box>
                    ) : null}
                  </Stack>
                ) : (
                  <Text size="sm" fw={400}>
                    <Anchor component={Link} to="/login" fw={600}>
                      Accedi
                    </Anchor>{' '}
                    per aggiungere un droplet.
                  </Text>
                )}
                  </>
                )}
              </Box>

              {/* Gestione campagna (owner/backoffice) */}
              {(isOwner || isBackoffice) && (
                <Box
                  p="lg"
                  style={{
                    border: '1px solid #dee2e6',
                    backgroundColor: '#fff9e6',
                  }}
                >
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="md">
                    Gestione
                  </Text>
                  <Stack gap="sm">
                    {isOwner ? (
                      <Stack gap="sm">
                        <Button
                          component={Link}
                          to={`/campaigns/${encodeURIComponent(campaign.slug)}/edit`}
                          variant="filled"
                          color="dark"
                          size="sm"
                          fullWidth
                        >
                          Modifica
                        </Button>
                        {canUploadGallery ? (
                          <Stack gap="sm">
                            <FileInput
                              label="Galleria immagini"
                              description="PNG, JPEG, WebP o GIF — fino a 10 file per volta (max 5 MB ciascuno)."
                              placeholder="Scegli file…"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              multiple
                              clearable
                              value={draftGalleryFiles.length > 0 ? draftGalleryFiles : undefined}
                              onChange={(files) => setDraftGalleryFiles(files ?? [])}
                              size="sm"
                            />
                            <Button
                              type="button"
                              loading={draftGalleryPending}
                              disabled={draftGalleryFiles.length === 0}
                              variant="light"
                              color="dark"
                              size="sm"
                              fullWidth
                              onClick={() => void uploadDraftGallery()}
                            >
                              Carica immagini
                            </Button>
                            {draftGalleryMsg ? (
                              <Alert color={draftGalleryMsg.includes('aggiornate') ? 'teal' : 'orange'} variant="light" p="sm">
                                <Text size="xs">{draftGalleryMsg}</Text>
                              </Alert>
                            ) : null}
                          </Stack>
                        ) : null}
                        {campaign.status === 'submitted_for_review' ? (
                          <Button
                            type="button"
                            loading={lifecyclePending}
                            onClick={() => void runLifecycle(`/api/v1/campaigns/${s}/withdraw-review`)}
                            variant="light"
                            color="orange"
                            size="sm"
                            fullWidth
                          >
                            Ritira dalla revisione (torna in bozza)
                          </Button>
                        ) : null}
                        {campaign.status === 'draft' || campaign.status === 'rejected' ? (
                          <Button
                            type="button"
                            loading={lifecyclePending}
                            onClick={() => void runLifecycle(`/api/v1/campaigns/${s}/submit-for-review`)}
                            variant="outline"
                            color="dark"
                            size="sm"
                            fullWidth
                          >
                            Invia per revisione
                          </Button>
                        ) : null}
                        {campaign.status === 'approved' ? (
                          <Button
                            type="button"
                            loading={lifecyclePending}
                            onClick={() => void runLifecycle(`/api/v1/campaigns/${s}/publish`)}
                            color="teal"
                            size="sm"
                            fullWidth
                          >
                            Pubblica
                          </Button>
                        ) : null}
                        {ownerPreview ? (
                          <Button
                            type="button"
                            loading={deletePending}
                            onClick={() => void onDeleteCampaign()}
                            variant="subtle"
                            color="red"
                            size="sm"
                            fullWidth
                          >
                            Elimina campagna
                          </Button>
                        ) : null}
                      </Stack>
                    ) : null}
                    {isBackoffice && campaign.status === 'submitted_for_review' ? (
                      <>
                        <Button
                          type="button"
                          loading={lifecyclePending}
                          onClick={() => void runLifecycle(`/api/v1/backoffice/campaigns/${s}/approve`)}
                          color="teal"
                          size="sm"
                          fullWidth
                        >
                          Approva
                        </Button>
                        <Button
                          type="button"
                          loading={lifecyclePending}
                          onClick={() => void runLifecycle(`/api/v1/backoffice/campaigns/${s}/reject`)}
                          variant="outline"
                          color="red"
                          size="sm"
                          fullWidth
                        >
                          Rifiuta
                        </Button>
                      </>
                    ) : null}
                    {lifecycleMsg ? (
                      <Alert color={lifecycleMsg === LIFECYCLE_OK ? 'teal' : 'red'} variant="light" p="sm">
                        <Text size="xs">{lifecycleMsg}</Text>
                      </Alert>
                    ) : null}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  )
}
