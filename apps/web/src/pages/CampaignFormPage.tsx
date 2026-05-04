import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Divider,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { apiFetch, apiFetchForm } from '../lib/api/client'
import { CAMPAIGN_CATEGORY_OPTIONS } from '../lib/campaignCategories'
import { formatCentsAsEuroField, parseEuroInputToCents } from '../lib/euroInput'
import { formatEuro } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']
type CampaignWrapped = { data: Campaign }

type CostRow = { label: string; amountEuro: string }

/** Somma voci di costo oltre la quale si applica il 2,5% SoFu (5.000,00 €), come `SofuPlatformFee::THRESHOLD_CENTS`. */
const SOFU_PLATFORM_FEE_THRESHOLD_CENTS = 500_000
const SOFU_FEE_THRESHOLD_EUROS = SOFU_PLATFORM_FEE_THRESHOLD_CENTS / 100

const FEE_BASIS_POINTS = 250

function basisPointsAmountCents(partialCents: number): number {
  return Math.round((partialCents * FEE_BASIS_POINTS) / 10_000)
}

const DESCRIPTION_PLACEHOLDER = `Descrivi obiettivi della campagna, cosa ottengono i sostenitori e tempistiche. Il testo deve avere almeno 50 caratteri per superare la validazione.`

const DURATION_PRESETS = [
  { value: '7', label: '7 giorni' },
  { value: '14', label: '14 giorni' },
  { value: '30', label: '30 giorni (consigliato)' },
  { value: '60', label: '60 giorni' },
  { value: '90', label: '90 giorni' },
]

function sumCostCents(rows: CostRow[]): number {
  let t = 0
  for (const r of rows) {
    const c = parseEuroInputToCents(r.amountEuro)
    if (c !== null && c > 0) t += c
  }
  return t
}

/** Tetto blooming drops di default da obiettivo lordo (centesimi) e soglia Bloom. */
function defaultFullBloomDrops(grossPoolCents: number, n: number): number {
  return Math.max(Math.ceil(grossPoolCents / 100), n + 1)
}

export default function CampaignFormPage(): ReactElement {
  const { slug: editSlug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const isEdit = Boolean(editSlug)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(!isEdit)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [category, setCategory] = useState<string | null>('')
  const [sofuFeeWaiverRequested, setSofuFeeWaiverRequested] = useState(false)
  const [waiverState, setWaiverState] = useState<
    'not_requested' | 'pending' | 'approved' | 'rejected' | null
  >(null)
  const [waiverReviewNote, setWaiverReviewNote] = useState<string | null>(null)
  /** Parziale caricato dal server (modifica), per allineare l’anteprima lorda all’esenzione approvata. */
  const [loadedCostSubtotalCents, setLoadedCostSubtotalCents] = useState<number | null>(null)
  const [growingDrops, setGrowingDrops] = useState<number | string>(50)
  const [fullBloomDrops, setFullBloomDrops] = useState<number | string>('')
  const [maxDropEuro, setMaxDropEuro] = useState('0')
  const [durationPreset, setDurationPreset] = useState<string | null>('30')
  const [durationCustom, setDurationCustom] = useState<number | string>(30)
  const [costRows, setCostRows] = useState<CostRow[]>([
    { label: 'Materiali', amountEuro: '3000' },
    { label: 'Manodopera', amountEuro: '1200' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const totalCents = useMemo(() => sumCostCents(costRows), [costRows])
  const overSofuThreshold = totalCents > SOFU_PLATFORM_FEE_THRESHOLD_CENTS

  const includeSofuLineInGross = useMemo((): boolean => {
    if (totalCents <= SOFU_PLATFORM_FEE_THRESHOLD_CENTS) return false
    if (
      isEdit &&
      waiverState === 'approved' &&
      sofuFeeWaiverRequested &&
      loadedCostSubtotalCents !== null &&
      totalCents === loadedCostSubtotalCents
    ) {
      return false
    }
    return true
  }, [totalCents, isEdit, waiverState, sofuFeeWaiverRequested, loadedCostSubtotalCents])

  const grossPoolCents = useMemo(() => {
    if (totalCents <= 0) return 0
    const tx = basisPointsAmountCents(totalCents)
    const sofu = includeSofuLineInGross ? basisPointsAmountCents(totalCents) : 0
    return totalCents + tx + sofu
  }, [totalCents, includeSofuLineInGross])

  const txFeeCents = totalCents > 0 ? basisPointsAmountCents(totalCents) : 0
  const sofuFeeCents =
    totalCents > SOFU_PLATFORM_FEE_THRESHOLD_CENTS && includeSofuLineInGross
      ? basisPointsAmountCents(totalCents)
      : 0
  const txFeeEuro = txFeeCents / 100
  const sofuFeeEuro = sofuFeeCents / 100
  const grandTotalEuro = grossPoolCents / 100

  const n = Number(growingDrops) || 0
  const m = Number(fullBloomDrops) || 0
  const minDropCents =
    m > 0 && grossPoolCents > 0 ? Math.max(1, Math.round(grossPoolCents / m)) : 0

  useEffect(() => {
    if (!isEdit || !editSlug) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch(`/api/v1/campaigns/${encodeURIComponent(editSlug)}`)
        if (!res.ok) {
          if (!cancelled) setLoadError(`Impossibile caricare la campagna (${res.status}).`)
          return
        }
        const json = (await res.json()) as CampaignWrapped
        const c = json.data
        if (cancelled) return
        setTitle(c.title)
        setSummary(c.summary ?? '')
        setDescription(c.description ?? '')
        setVideoUrl(c.video_url ?? '')
        setCategory(c.category ?? '')
        setSofuFeeWaiverRequested(Boolean(c.sofu_fee_waiver_requested))
        setWaiverState(
          (c.sofu_fee_waiver_state as 'not_requested' | 'pending' | 'approved' | 'rejected') ?? null,
        )
        setWaiverReviewNote(c.sofu_fee_waiver_review_note ?? null)
        setGrowingDrops(c.target_supporters)
        setFullBloomDrops(c.full_bloom_drops ?? '')
        setMaxDropEuro(formatCentsAsEuroField(c.max_price_cents))
        if (c.ends_at) {
          const days = Math.max(
            1,
            Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86_400_000),
          )
          setDurationCustom(days)
          const standard = [7, 14, 30, 60, 90]
          setDurationPreset(standard.includes(days) ? String(days) : null)
        }
        setCostRows(
          (c.cost_items ?? []).map((it) => ({
            label: it.label,
            amountEuro: formatCentsAsEuroField(it.amount_cents),
          })),
        )
        const loadedSub =
          c.cost_subtotal_cents ??
          (c.cost_items ?? []).reduce((s, it) => s + it.amount_cents, 0)
        setLoadedCostSubtotalCents(loadedSub)
        setLoadError(null)
        setInitialLoaded(true)
      } catch {
        if (!cancelled) setLoadError('Errore di rete.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isEdit, editSlug])

  useEffect(() => {
    if (isEdit) return
    if (grossPoolCents <= 0 || n < 1) return
    const maxC = Math.max(1, Math.ceil(grossPoolCents / n))
    setMaxDropEuro(formatCentsAsEuroField(maxC))
  }, [isEdit, grossPoolCents, n])

  useEffect(() => {
    if (isEdit) return
    if (fullBloomDrops !== '') return
    if (grossPoolCents <= 0 || n < 1) return
    setFullBloomDrops(defaultFullBloomDrops(grossPoolCents, n))
  }, [isEdit, grossPoolCents, n, fullBloomDrops])

  useEffect(() => {
    if (totalCents <= SOFU_PLATFORM_FEE_THRESHOLD_CENTS) {
      setSofuFeeWaiverRequested(false)
    }
  }, [totalCents])

  const isCreator = user?.role === 'creator' || user?.role === 'operator' || user?.role === 'admin'

  function addCostRow(): void {
    setCostRows((r) => [...r, { label: '', amountEuro: '0' }])
  }

  function updateCostRow(i: number, patch: Partial<CostRow>): void {
    setCostRows((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  function removeCostRow(i: number): void {
    setCostRows((rows) => rows.filter((_, j) => j !== i))
  }

  function onGrowingChange(v: number | string): void {
    setGrowingDrops(v)
    const nn = Number(v) || 0
    if (grossPoolCents > 0 && nn > 0) {
      const maxC = Math.max(1, Math.ceil(grossPoolCents / nn))
      setMaxDropEuro(formatCentsAsEuroField(maxC))
    }
  }

  function onMaxDropEuroChange(val: string): void {
    setMaxDropEuro(val)
    const maxC = parseEuroInputToCents(val)
    if (maxC !== null && maxC > 0 && grossPoolCents > 0) {
      const nn = Math.max(1, Math.ceil(grossPoolCents / maxC))
      setGrowingDrops(nn)
    }
  }

  function effectiveDurationDays(): number {
    const preset = durationPreset ? Number(durationPreset) : NaN
    if (Number.isFinite(preset) && preset > 0) return Math.min(730, Math.max(1, preset))
    const c = Number(durationCustom)
    if (Number.isFinite(c) && c > 0) return Math.min(730, Math.max(1, c))
    return 30
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!user) return

    const nn = Number(growingDrops)
    const mm = Number(fullBloomDrops) || defaultFullBloomDrops(grossPoolCents, nn)

    if (!(nn >= 1)) {
      setError('Imposta un numero valido di Growing drops.')
      return
    }

    const cost_items = costRows
      .map((row) => ({
        label: row.label.trim(),
        amount_cents: parseEuroInputToCents(row.amountEuro) ?? 0,
      }))
      .filter((row) => row.label.length > 0 && row.amount_cents > 0)

    if (cost_items.length === 0) {
      setError('Aggiungi almeno una voce di costo con etichetta e importo in euro.')
      return
    }

    const v = videoUrl.trim()
    const hasVideo = v.length > 0
    if (!isEdit && !hasVideo && imageFiles.length === 0) {
      setError('Senza video, carica almeno un’immagine di copertina (o incolla un URL video).')
      return
    }

    const catVal = category?.trim() ?? ''

    const body = {
      title: title.trim(),
      summary: summary.trim() || null,
      description: description.trim(),
      video_url: hasVideo ? v : null,
      category: catVal.length > 0 ? catVal : null,
      is_commercial: false,
      sofu_fee_waiver_requested: overSofuThreshold && sofuFeeWaiverRequested,
      currency: 'EUR',
      target_supporters: nn,
      full_bloom_drops: mm,
      duration_days: effectiveDurationDays(),
      cost_items,
    }

    setPending(true)
    try {
      const url = isEdit
        ? `/api/v1/campaigns/${encodeURIComponent(editSlug!)}`
        : '/api/v1/campaigns'
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        json: body,
      })
      const raw = await res.text()
      let parsed: unknown = null
      try {
        parsed = raw === '' ? null : JSON.parse(raw)
      } catch {
        parsed = null
      }
      if (res.status === 403) {
        const apiMsg =
          parsed && typeof parsed === 'object' && 'message' in parsed
            ? String((parsed as { message: unknown }).message).trim()
            : ''
        setError(
          apiMsg.length > 0
            ? apiMsg
            : 'Non hai i permessi per questa operazione o la campagna non è in uno stato che consente le modifiche.',
        )
        return
      }
      if (res.status === 422 && parsed && typeof parsed === 'object' && 'errors' in parsed) {
        const errors = (parsed as { errors: Record<string, string[]> }).errors
        setError(Object.values(errors).flat()[0] ?? 'Dati non validi.')
        return
      }
      if (!res.ok) {
        setError(`Operazione non riuscita (${res.status}).`)
        return
      }
      const json = parsed as CampaignWrapped
      if (!json?.data?.slug) {
        setError('Risposta imprevista dal server.')
        return
      }
      const saved = json.data
      setSofuFeeWaiverRequested(Boolean(saved.sofu_fee_waiver_requested))
      setWaiverState(
        (saved.sofu_fee_waiver_state as 'not_requested' | 'pending' | 'approved' | 'rejected') ?? null,
      )
      setWaiverReviewNote(saved.sofu_fee_waiver_review_note ?? null)
      setLoadedCostSubtotalCents(
        saved.cost_subtotal_cents ??
          (saved.cost_items ?? []).reduce((s, it) => s + it.amount_cents, 0),
      )
      const s = saved.slug

      if (imageFiles.length > 0) {
        const fd = new FormData()
        for (const file of imageFiles) {
          fd.append('images[]', file)
        }
        const uploadRes = await apiFetchForm(`/api/v1/campaigns/${encodeURIComponent(s)}/media`, fd)
        const uploadRaw = await uploadRes.text()
        let uploadBody: unknown = null
        try {
          uploadBody = uploadRaw === '' ? null : JSON.parse(uploadRaw)
        } catch {
          uploadBody = null
        }
        if (uploadRes.status === 422 && uploadBody && typeof uploadBody === 'object' && 'errors' in uploadBody) {
          const errors = (uploadBody as { errors: Record<string, string[]> }).errors
          setError(
            `Salvato, ma il caricamento immagini non è valido: ${Object.values(errors).flat()[0] ?? 'errori.'} Puoi riprovare dalla scheda campagna.`,
          )
          navigate(`/campaigns/${encodeURIComponent(s)}`, { replace: true })
          return
        }
        if (!uploadRes.ok) {
          const uploadMsg =
            uploadRes.status === 403 &&
            uploadBody &&
            typeof uploadBody === 'object' &&
            'message' in uploadBody
              ? String((uploadBody as { message: unknown }).message).trim()
              : ''
          setError(
            uploadMsg.length > 0
              ? `Salvato, ma la galleria non è stata aggiornata: ${uploadMsg}`
              : `Salvato, ma il caricamento immagini è fallito (${uploadRes.status}). Apri la scheda per riprovare.`,
          )
          navigate(`/campaigns/${encodeURIComponent(s)}`, { replace: true })
          return
        }
      }

      navigate(`/campaigns/${encodeURIComponent(s)}`, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Richiesta non riuscita.'
      setError(message)
    } finally {
      setPending(false)
    }
  }

  if (authLoading || (isEdit && !initialLoaded)) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={28} width="50%" />
        <Skeleton height={400} radius="lg" />
      </Stack>
    )
  }

  if (loadError) {
    return (
      <Stack gap="md" py="md">
        <Alert color="red">{loadError}</Alert>
        <Anchor component={Link} to="/me/campaigns">
          Le mie campagne
        </Anchor>
      </Stack>
    )
  }

  if (!user) {
    return (
      <Stack gap="lg" py="md">
        <Card withBorder padding="xl" radius="lg" shadow="sm">
          <Stack gap="md" maw={480}>
            <Title order={3}>Nuova campagna</Title>
            <Text c="dimmed" lh={1.6}>
              Accedi per creare una bozza.
            </Text>
            <Button component={Link} to="/login" color="teal" w="fit-content">
              Accedi
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  if (!isCreator) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Campagna</Title>
        <Alert color="orange" title="Account sostenitore" variant="light">
          Il tuo profilo non ha il ruolo creator.
        </Alert>
        <Button component={Link} to="/register" variant="light">
          Registrazione
        </Button>
      </Stack>
    )
  }

  return (
    <Stack gap="xl" py={{ base: 'md', sm: 'lg' }} pb="xl">
      <Breadcrumbs>
        <Anchor component={Link} to="/campaigns" size="sm">
          Campagne
        </Anchor>
        <Text size="sm" c="dimmed">
          {isEdit ? 'Modifica campagna' : 'Nuova campagna'}
        </Text>
      </Breadcrumbs>

      <Stack gap="xs">
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          {isEdit ? 'Modifica campagna' : 'Nuova campagna'}
        </Title>
        <Text c="dimmed" maw={820} lh={1.65}>
          Una volta compilati i campi, la campagna dovrà essere sottoposta a revisione, prima di essere pubblicata.
          Nessuna piattaforma seria le accetta in automatico: è normale e ti protegge insieme alla comunità.
        </Text>
      </Stack>

      <Paper
        component="form"
        onSubmit={(e) => void onSubmit(e)}
        withBorder
        radius="lg"
        p={{ base: 'md', sm: 'xl' }}
        shadow="sm"
      >
        <Stack gap="xl">
          {/* Ordine: identità e contenuto → Bloom economico → Growing drops → Blooming drops (tetto) → durata → media */}

          <TextInput
            label="Nome campagna"
            description="Massimo 160 caratteri."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            radius="md"
          />

          <Textarea
            label="Descrizione"
            description="Almeno 50 caratteri. Per ora un unico campo; in assenza di riassunto, per le card si potranno usare le prime righe."
            placeholder={DESCRIPTION_PLACEHOLDER}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={50}
            autosize
            minRows={5}
            radius="md"
          />

          <TextInput
            label="Riassunto (opzionale)"
            description="Dopo la descrizione: breve sottotitolo per card e liste."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={500}
            radius="md"
          />

          <TextInput
            label="Video (URL)"
            description="Campo per il video; se manca, in fase di invio sarà obbligatoria almeno un’immagine di copertina."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            radius="md"
          />

          <Select
            label="Categoria"
            description="Stesse categorie della pagina Campagne, per categorizzare e cercare in modo coerente."
            placeholder="Scegli…"
            data={CAMPAIGN_CATEGORY_OPTIONS as unknown as { value: string; label: string }[]}
            value={category ?? ''}
            onChange={setCategory}
            clearable
            radius="md"
          />

          <Divider />

          <Stack gap="xs">
            <Title order={4}>Bloom — cifra necessaria perché la campagna vada a buon fine</Title>
            <Text size="sm" c="dimmed">
              La somma delle voci definisce l’obiettivo economico della campagna.
            </Text>
          </Stack>

          <Stack gap="sm">
            {costRows.map((row, i) => (
              <Group key={i} align="flex-end" wrap="wrap" gap="sm">
                <TextInput
                  placeholder="Voce (es. Noleggio)"
                  label={i === 0 ? 'Voce' : undefined}
                  value={row.label}
                  onChange={(e) => updateCostRow(i, { label: e.target.value })}
                  style={{ flex: '1 1 200px' }}
                  radius="md"
                />
                <TextInput
                  label={i === 0 ? 'Importo (€)' : undefined}
                  placeholder="0,00"
                  value={row.amountEuro}
                  onChange={(e) => updateCostRow(i, { amountEuro: e.target.value })}
                  style={{ flex: '0 1 140px' }}
                  radius="md"
                />
                {costRows.length > 1 ? (
                  <Button type="button" variant="light" color="red" onClick={() => removeCostRow(i)}>
                    Rimuovi
                  </Button>
                ) : null}
              </Group>
            ))}
            <Button type="button" variant="light" onClick={addCostRow}>
              Aggiungi voce
            </Button>
          </Stack>

          <Stack gap="xs" p="md" style={{ background: '#f8f9fa', borderRadius: 8 }}>
            <Group justify="space-between">
              <Text size="sm">Totale parziale</Text>
              <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatEuro(totalCents, 'EUR')}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Gestione transazioni — 2,5%
              </Text>
              <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {txFeeEuro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed" maw={520}>
                Commissione SoFu — 2,5% sul parziale se supera {SOFU_FEE_THRESHOLD_EUROS.toLocaleString('it-IT')}{' '}
                € (calcolata mentre componi le voci). Opt-out: puoi chiedere l’esenzione per no-profit / raccolta fondi; la
                decisione avviene in revisione.
              </Text>
              <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {overSofuThreshold
                  ? sofuFeeEuro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
                  : '—'}
              </Text>
            </Group>
            {overSofuThreshold && waiverState === 'pending' ? (
              <Text size="xs" c="orange.8" lh={1.5}>
                Hai chiesto l’esenzione: finché la revisione non decide, qui mostriamo comunque il 2,5% come riferimento.
              </Text>
            ) : null}
            {overSofuThreshold && waiverState === 'approved' ? (
              <Text size="xs" c="teal.8" lh={1.5}>
                Esenzione concessa in revisione: nessuna commissione SoFu sull’obiettivo.
              </Text>
            ) : null}
            {overSofuThreshold && waiverState === 'rejected' && waiverReviewNote ? (
              <Alert color="red" variant="light">
                <Text size="xs">Esenzione non concessa: {waiverReviewNote}</Text>
              </Alert>
            ) : null}
            <Checkbox
              label="Richiedi esenzione dalla commissione SoFu (es. no-profit, raccolta fondi senza budget infrastruttura)"
              description={
                overSofuThreshold
                  ? 'In revisione valuteremo se concederla; se non è possibile, riceverai una motivazione.'
                  : `Disponibile se il parziale supera ${SOFU_FEE_THRESHOLD_EUROS.toLocaleString('it-IT')} €.`
              }
              checked={sofuFeeWaiverRequested}
              disabled={!overSofuThreshold}
              onChange={(e) => setSofuFeeWaiverRequested(e.currentTarget.checked)}
            />
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Totale</Text>
              <Text fw={700} size="lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {grandTotalEuro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </Text>
            </Group>
          </Stack>

          <Divider />

          <Stack gap="md">
            <Title order={5}>Growing drops — quote in crescita fino al Bloom</Title>
            <Text size="sm" c="dimmed" maw={820} lh={1.65}>
              Prima del Bloom non parliamo ancora di “fioritura”: sono drop in crescita dal seme alla soglia di Bloom.
              È importante scindere il numero di quote dal numero di persone: chi sosterrà potrà prendere più prodotti, e
              chi crea la campagna ragiona sulle quote. Inserendo il numero di Growing drops, il campo successivo si
              aggiorna in automatico — e viceversa: restano entrambi modificabili e collegati (anche sulla stessa riga).
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Growing drops"
                value={growingDrops}
                onChange={onGrowingChange}
                min={1}
                required
                radius="md"
              />
              <TextInput
                label="Valore massimo Drop — offerta di partenza di ogni quota (€)"
                description="Dopo il Bloom definito e la quantità di drop, questo valore è l’offerta d’ingresso che la gente vede."
                value={maxDropEuro}
                onChange={(e) => onMaxDropEuroChange(e.target.value)}
                placeholder="0,00"
                required
                radius="md"
              />
            </SimpleGrid>
          </Stack>

          <Divider />

          <Stack gap="md">
            <Title order={5}>Blooming drops — dopo il Bloom, la fioritura</Title>
            <Text size="sm" c="dimmed" maw={820} lh={1.65}>
              Quando l’obiettivo di Growing drops è raggiunto, la campagna è andata a buon fine e le adesioni entrano in
              fase blooming: ogni nuova quota aiuta la fioritura e può far scendere l’offerta per tutti.
            </Text>
            <Text size="sm" c="dimmed" maw={820} lh={1.65}>
              Il tetto qui sotto è il numero massimo di blooming drops (posti) verso la fioritura completa; insieme
              all’obiettivo economico definisce anche l’offerta minima possibile. Nei tutorial approfondiremo minimo e
              massimo in questa logica.
            </Text>
            <NumberInput
              label="Blooming drops — tetto quote (fioritura completa)"
              description="Es. massimo oggetti o biglietti in fase blooming; se lasci vuoto, proponiamo un default legato all’obiettivo."
              value={fullBloomDrops}
              onChange={setFullBloomDrops}
              min={1}
              radius="md"
            />
            <TextInput
              label="Valore minimo Drop — offerta finale limite (€)"
              description="Calcolato automaticamente: obiettivo lordo (parziale + commissioni) ÷ tetto blooming drops. Non modificabile."
              value={m > 0 && grossPoolCents > 0 ? formatCentsAsEuroField(minDropCents) : '—'}
              disabled
              radius="md"
            />
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Title order={5}>Durata della campagna</Title>
            <Text size="sm" c="dimmed">
              Giorni o soglie predefinite (default 30). In seguito potremo prevedere estensioni e stretch goal.
            </Text>
            <Select
              label="Soglie predefinite"
              data={DURATION_PRESETS}
              value={durationPreset}
              onChange={(v) => {
                setDurationPreset(v)
                if (v) setDurationCustom(Number(v))
              }}
              clearable
              placeholder="Oppure indica solo i giorni sotto"
              radius="md"
            />
            <NumberInput
              label="Giorni"
              value={durationCustom}
              onChange={setDurationCustom}
              min={1}
              max={730}
              radius="md"
            />
          </Stack>

          <Divider label="Immagini" labelPosition="left" />
          <Text size="sm" c="dimmed">
            PNG, JPEG, WebP o GIF — fino a 10 file per invio. Copertina consigliata se non c’è video.
          </Text>
          <FileInput
            label="Galleria / copertina"
            placeholder="Scegli una o più immagini…"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            clearable
            value={imageFiles.length > 0 ? imageFiles : undefined}
            onChange={(files) => setImageFiles(files ?? [])}
            radius="md"
          />

          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={pending} color="teal" size="md">
              {isEdit ? 'Salva modifiche' : 'Crea bozza'}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
