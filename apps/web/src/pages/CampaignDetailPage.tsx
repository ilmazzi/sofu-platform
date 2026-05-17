import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  FileInput,
  Grid,
  NumberInput,
  Group,
  Progress,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
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
  bloomingCapForDisplay,
  campaignBloomProgressPercent,
  campaignHasReachedBloom,
  reservationBlocksNewDroplet,
  reservationDropCount,
  reservationEligibleForPayment,
  reservationPaymentAmountCents,
} from '../lib/bloom'
import { LABEL_BLOOMING_DROP_CURRENT } from '../lib/dropMechanics'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import {
  hasTransparentZeroProfit,
  isGuadagnoCostLabel,
  ZERO_PROFIT_BADGE,
  ZERO_PROFIT_DETAIL_HINT,
} from '../lib/campaignCosts'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type CampaignWrapped = { data: Campaign }
type Reservation = components['schemas']['Reservation']
type ReservationWrapped = { data: Reservation }
type Payment = components['schemas']['Payment']
type PaymentWrapped = { data: Payment }

const RESERVABLE: string[] = ['published', 'activated']

const LIFECYCLE_OK = 'Operazione completata.'

const SOFU_FEE_THRESHOLD_CENTS = 500_000

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
  const [pledgePanelOpen, setPledgePanelOpen] = useState(false)
  const [pledgeDropCount, setPledgeDropCount] = useState<number | string>(1)
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
  const [waiverRejectNote, setWaiverRejectNote] = useState('')

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

  const costSubtotalCentsForWaiver =
    campaign !== null
      ? (campaign.cost_subtotal_cents ??
          (campaign.cost_items ?? []).reduce((s, it) => s + it.amount_cents, 0))
      : 0

  const needsSofuWaiverDecision =
    campaign !== null &&
    isBackoffice &&
    campaign.status === 'submitted_for_review' &&
    costSubtotalCentsForWaiver > SOFU_FEE_THRESHOLD_CENTS &&
    Boolean(campaign.sofu_fee_waiver_requested) &&
    campaign.sofu_fee_waiver_state === 'pending'

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

  async function decideSofuFeeWaiver(approve: boolean): Promise<void> {
    if (!campaign || !isBackoffice) return
    const note = waiverRejectNote.trim()
    if (!approve && note.length === 0) {
      setLifecycleMsg('Per negare l’esenzione indica un motivo visibile al creator.')
      return
    }
    setLifecycleMsg(null)
    setLifecyclePending(true)
    try {
      const res = await apiFetch(`/api/v1/backoffice/campaigns/${encodeURIComponent(campaign.slug)}/sofu-fee-waiver`, {
        method: 'POST',
        json: {
          decision: approve ? 'approve' : 'reject',
          note: approve ? null : note,
        },
      })
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
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
      setWaiverRejectNote('')
      setReloadTick((t) => t + 1)
      setLifecycleMsg(LIFECYCLE_OK)
    } catch {
      setLifecycleMsg('Errore di rete.')
    } finally {
      setLifecyclePending(false)
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
    const drops = Math.max(1, Math.min(10_000, Math.floor(Number(pledgeDropCount) || 1)))
    setReserveMsg(null)
    setPayment(null)
    setPaymentMsg(null)
    setReservePending(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await apiFetch(`/api/v1/campaigns/${encodeURIComponent(slug)}/reservations`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        json: { idempotency_key: idempotencyKey, drop_count: drops },
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
      setPledgePanelOpen(false)
      const n = json.data.drop_count ?? drops
      const dropLabel = n === 1 ? '1 drop' : `${n} drop`
      setReserveMsg(
        `${dropLabel} inserite nell’annaffiatoio. Impegno totale: ${formatEuro(json.data.effective_price_cents, campaign?.currency ?? 'EUR')}. Nessun addebito immediato: fino al Bloom il valore resta quello dell’offerta con cui entri; l’incasso avviene solo quando le regole della campagna lo consentono (non al solo clic).`,
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
          ? null
          : 'Inserisci i dati della carta qui sotto per completare il contributo.',
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
  const transparentZeroProfit = hasTransparentZeroProfit(campaign.cost_items)
  const reserveOk = reserveMsg?.includes('annaffiatoio') ?? false
  const bloomed = campaignHasReachedBloom(campaign)
  const bloomPct = campaignBloomProgressPercent(campaign)
  const bloomingCap = bloomingCapForDisplay(campaign)
  const reservationDrops =
    effectiveReservation !== null ? reservationDropCount(effectiveReservation) : 1
  const reservationPayCents =
    campaign && effectiveReservation
      ? reservationPaymentAmountCents(campaign, effectiveReservation)
      : 0
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
              inFioritura={bloomed}
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
                {transparentZeroProfit ? (
                  <Alert color="teal" variant="light" mb="sm" title={ZERO_PROFIT_BADGE}>
                    <Text size="sm" lh={1.55}>
                      {ZERO_PROFIT_DETAIL_HINT}
                    </Text>
                  </Alert>
                ) : null}
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
                    {costRows.map((row) => {
                      const zeroGuadagno =
                        isGuadagnoCostLabel(row.label) && row.amount_cents === 0
                      return (
                        <Table.Tr
                          key={row.id}
                          style={
                            zeroGuadagno
                              ? {
                                  backgroundColor: '#e6f7f3',
                                  boxShadow: 'inset 3px 0 0 #0d6b5c',
                                }
                              : undefined
                          }
                        >
                          <Table.Td style={{ fontWeight: zeroGuadagno ? 700 : 500 }}>
                            <Group gap="xs" wrap="nowrap">
                              <span>{row.label}</span>
                              {zeroGuadagno ? (
                                <Badge size="xs" color="teal" variant="filled">
                                  Trasparenza
                                </Badge>
                              ) : null}
                            </Group>
                          </Table.Td>
                          <Table.Td
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: zeroGuadagno ? 800 : 600,
                              color: zeroGuadagno ? '#0d6b5c' : undefined,
                            }}
                          >
                            {formatEuro(row.amount_cents, campaign.currency)}
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                  <Table.Tfoot>
                    <Table.Tr>
                      <Table.Td style={{ fontWeight: 700, borderTop: '2px solid #dee2e6' }}>Totale</Table.Td>
                      <Table.Td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          borderTop: '2px solid #dee2e6',
                        }}
                      >
                        {formatEuro(costSubtotalCentsForWaiver, campaign.currency)}
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tfoot>
                </Table>
              </Box>
            ) : null}

            <Text component="p" size="xs" c="dimmed" lh={1.65} maw={720} mt="md">
              <Text span fw={600} c="dimmed">
                Commissione piattaforma.{' '}
              </Text>
              Sugli obiettivi che superano{' '}
              {(SOFU_FEE_THRESHOLD_CENTS / 100).toLocaleString('it-IT')} € (somma delle voci dichiarate), SoFu applica il 2,5%
              a supporto del servizio. Associazioni, no-profit e raccolte fondi possono chiedere in fase di revisione
              l’esenzione, quando compatibile con la sostenibilità della piattaforma. Dettagli economici della singola
              campagna restano tra creator e SoFu in sede di revisione.
            </Text>
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
                        <Stack gap="sm">
                          {!pledgePanelOpen ? (
                            <Button
                              type="button"
                              color="dark"
                              size="md"
                              fullWidth
                              onClick={() => {
                                setPledgePanelOpen(true)
                                setReserveMsg(null)
                              }}
                              style={{
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                              }}
                            >
                              💧 Sostieni questa campagna
                            </Button>
                          ) : (
                            <form onSubmit={(e) => void onReserve(e)}>
                              <Stack
                                gap="sm"
                                p="md"
                                style={{
                                  border: '1px solid #dee2e6',
                                  backgroundColor: '#f8f9fa',
                                }}
                              >
                                <div>
                                  <Text size="sm" fw={700} lh={1.35}>
                                    Quante drop prometti di versare?
                                  </Text>
                                  <Text size="xs" c="dimmed" mt={4} lh={1.5}>
                                    Se credi in questa campagna, offri di versare più quote.
                                  </Text>
                                </div>
                                <NumberInput
                                  label="Numero di drop"
                                  description={
                                    campaign
                                      ? `Prezzo indicativo per una drop ora: ${formatEuro(campaign.current_price_cents, campaign.currency)}`
                                      : undefined
                                  }
                                  min={1}
                                  max={10_000}
                                  allowDecimal={false}
                                  value={pledgeDropCount}
                                  onChange={setPledgeDropCount}
                                  size="md"
                                />
                                <Group gap="xs" grow>
                                  <Button
                                    type="button"
                                    variant="default"
                                    onClick={() => setPledgePanelOpen(false)}
                                    disabled={reservePending}
                                  >
                                    Annulla
                                  </Button>
                                  <Button
                                    type="submit"
                                    loading={reservePending}
                                    color="dark"
                                    style={{
                                      fontWeight: 600,
                                      letterSpacing: '0.02em',
                                      textTransform: 'uppercase',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    Conferma impegno
                                  </Button>
                                </Group>
                              </Stack>
                            </form>
                          )}
                          {reserveMsg ? (
                            <Alert color={reserveOk ? 'teal' : 'red'} variant="light" p="sm">
                              <Text size="xs">{reserveMsg}</Text>
                            </Alert>
                          ) : null}
                        </Stack>
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
                          {(effectiveReservation.drop_count ?? 1) > 1
                            ? ` · ${effectiveReservation.drop_count} drop promesse`
                            : null}
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
                              Growing drops verso il Bloom
                            </Text>
                            <Progress value={bloomPct} size="sm" radius="xl" color="teal" />
                            <Text size="xs" c="dimmed">
                              {Math.round(bloomPct)}% — {campaign.active_reservations_count} / {campaign.target_supporters}{' '}
                              growing drops (posti)
                            </Text>
                            <Text size="xs" c="dimmed">
                              {reservationDrops > 1 ? (
                                <>
                                  <Text span fw={600} c="dark">
                                    {reservationDrops} Growing drop promesse
                                  </Text>
                                  {' · '}
                                </>
                              ) : null}
                              Impegno totale (fino al Bloom):{' '}
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
                                La campagna è andata a buon fine. Il {LABEL_BLOOMING_DROP_CURRENT.toLowerCase()} può
                                ancora scendere fino al limite o alla fine della raccolta; confermi il contributo
                                sull’importo indicato dal sistema in quel momento.
                              </Text>
                            </Alert>
                            <Text size="xs">
                              {reservationDrops > 1 ? (
                                <>
                                  <Text span fw={600}>Drop promesse: {reservationDrops}</Text>
                                  {' · '}
                                </>
                              ) : null}
                              {LABEL_BLOOMING_DROP_CURRENT}:{' '}
                              <Text span fw={700}>
                                {formatEuro(reservationPayCents, campaign.currency)}
                              </Text>
                              {reservationDrops > 1 ? (
                                <Text span c="dimmed">
                                  {' '}
                                  ({reservationDrops} ×{' '}
                                  {formatEuro(campaign.current_price_cents, campaign.currency)})
                                </Text>
                              ) : null}
                              .
                            </Text>
                            {bloomingCap !== null ? (
                              <Text size="xs" c="dimmed">
                                Blooming drops nella campagna: {campaign.active_reservations_count} / {bloomingCap}{' '}
                                posti verso il tetto di fioritura.
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">
                                Blooming drops nella campagna: {campaign.active_reservations_count} adesioni dopo il
                                Bloom.
                              </Text>
                            )}
                          </Stack>
                        ) : null}

                        {effectiveReservation.status === 'failed' && bloomed ? (
                          <Stack gap="sm">
                            <Alert color="red" variant="light" p="sm">
                              <Text size="xs">Pagamento non riuscito — riprova qui sotto.</Text>
                            </Alert>
                            <Text size="xs">
                              {LABEL_BLOOMING_DROP_CURRENT}:{' '}
                              <Text span fw={700}>
                                {formatEuro(reservationPayCents, campaign.currency)}
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
                              Confermi il contributo per{' '}
                              <Text span fw={600}>
                                {formatEuro(reservationPayCents, campaign.currency)}
                              </Text>
                              {reservationDrops > 1
                                ? ` (${reservationDrops} Blooming drop al prezzo di campagna attuale).`
                                : ' (1 Blooming drop al prezzo di campagna attuale).'}
                              {' '}L’importo può ancora variare fino alla chiusura della campagna.
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
                                {payment.provider === 'mock' ? (
                                  <Alert color="teal" variant="light" p="sm">
                                    <Text size="xs">
                                      Conferma registrata per{' '}
                                      <Text span fw={700}>
                                        {formatEuro(payment.amount_cents, payment.currency)}
                                      </Text>
                                      . In questa anteprima non serve inserire la carta: l’addebito seguirà le regole
                                      della campagna quando previsto.
                                    </Text>
                                  </Alert>
                                ) : (
                                  <>
                                    <Text size="xs" c="dimmed">
                                      Importo da pagare:{' '}
                                      <Text span fw={700}>
                                        {formatEuro(payment.amount_cents, payment.currency)}
                                      </Text>
                                    </Text>
                                    <StripePaymentForm
                                      payment={payment}
                                      returnNextPath={`/campaigns/${encodeURIComponent(campaign.slug)}`}
                                      onCompleted={() => {
                                        setPaymentMsg('Pagamento completato.')
                                        setReloadTick((t) => t + 1)
                                        window.setTimeout(() => setReloadTick((t) => t + 1), 1200)
                                        navigate(`/campaigns/${encodeURIComponent(campaign.slug)}?payment=success`, {
                                          replace: true,
                                        })
                                      }}
                                    />
                                  </>
                                )}
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
                        {needsSofuWaiverDecision ? (
                          <Stack gap="sm">
                            <Alert color="gray" variant="light" title="Commissione SoFu — esenzione richiesta">
                              <Text size="xs" lh={1.55}>
                                Il creator ha chiesto di non applicare il 2,5% sull’obiettivo (oltre 5.000 €). Decidi prima
                                di approvare la campagna.
                              </Text>
                            </Alert>
                            <Textarea
                              label="Motivo (obbligatorio se neghi)"
                              placeholder="Spiega al creator perché l’esenzione non è concessa…"
                              value={waiverRejectNote}
                              onChange={(e) => setWaiverRejectNote(e.currentTarget.value)}
                              minRows={2}
                              size="sm"
                            />
                            <Button
                              type="button"
                              loading={lifecyclePending}
                              onClick={() => void decideSofuFeeWaiver(true)}
                              color="teal"
                              size="sm"
                              variant="light"
                              fullWidth
                            >
                              Concedi esenzione
                            </Button>
                            <Button
                              type="button"
                              loading={lifecyclePending}
                              onClick={() => void decideSofuFeeWaiver(false)}
                              variant="outline"
                              color="orange"
                              size="sm"
                              fullWidth
                            >
                              Nega esenzione
                            </Button>
                          </Stack>
                        ) : null}
                        <Button
                          type="button"
                          loading={lifecyclePending}
                          onClick={() => void runLifecycle(`/api/v1/backoffice/campaigns/${s}/approve`)}
                          color="teal"
                          size="sm"
                          fullWidth
                          disabled={Boolean(needsSofuWaiverDecision)}
                        >
                          Approva campagna
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
                          Rifiuta campagna
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
