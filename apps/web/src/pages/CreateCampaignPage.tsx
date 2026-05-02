import { useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Divider,
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
import { Link, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type Campaign = components['schemas']['Campaign']
type CampaignWrapped = { data: Campaign }

type CostRow = { label: string; amount_cents: string }

const DESCRIPTION_PLACEHOLDER = `Descrivi obiettivi della campagna, cosa ottengono i sostenitori e tempistiche. Il testo deve avere almeno 50 caratteri per superare la validazione.`

const CATEGORY_OPTIONS = [
  { value: '', label: 'Nessuna' },
  { value: 'education', label: 'Educazione' },
  { value: 'environment', label: 'Ambiente' },
  { value: 'health', label: 'Salute' },
  { value: 'community', label: 'Comunità' },
]

export default function CreateCampaignPage(): ReactElement {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | null>('')
  const [currency, setCurrency] = useState('EUR')
  const [targetSupporters, setTargetSupporters] = useState<string | number>(50)
  const [minPriceCents, setMinPriceCents] = useState<string | number>(1000)
  const [maxPriceCents, setMaxPriceCents] = useState<string | number>(5000)
  const [costRows, setCostRows] = useState<CostRow[]>([
    { label: 'Materiali', amount_cents: '300000' },
    { label: 'Manodopera', amount_cents: '120000' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isCreator = user?.role === 'creator' || user?.role === 'operator' || user?.role === 'admin'

  function addCostRow(): void {
    setCostRows((r) => [...r, { label: '', amount_cents: '1000' }])
  }

  function updateCostRow(i: number, patch: Partial<CostRow>): void {
    setCostRows((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  function removeCostRow(i: number): void {
    setCostRows((rows) => rows.filter((_, j) => j !== i))
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!user) return

    const min = Number(minPriceCents)
    const max = Number(maxPriceCents)
    if (!(min > 0 && max > min)) {
      setError('Prezzo minimo e massimo (centesimi): il minimo deve essere positivo e inferiore al massimo.')
      return
    }

    const cost_items = costRows
      .map((row) => ({
        label: row.label.trim(),
        amount_cents: Number(row.amount_cents),
      }))
      .filter((row) => row.label.length > 0 && row.amount_cents > 0)

    if (cost_items.length === 0) {
      setError('Aggiungi almeno una voce di costo con etichetta e importo in centesimi.')
      return
    }

    const catVal = category?.trim() || ''

    setPending(true)
    try {
      const res = await apiFetch('/api/v1/campaigns', {
        method: 'POST',
        json: {
          title: title.trim(),
          summary: summary.trim() || null,
          description: description.trim(),
          category: catVal.length > 0 ? catVal : null,
          currency,
          target_supporters: Number(targetSupporters),
          min_price_cents: min,
          max_price_cents: max,
          cost_items,
        },
      })
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
      }
      if (res.status === 403) {
        setError(
          'Solo i creator (e lo staff) possono creare campagne. Registrati con l’opzione creator o usa un account operatore.',
        )
        return
      }
      if (res.status === 422 && body && typeof body === 'object' && 'errors' in body) {
        const errors = (body as { errors: Record<string, string[]> }).errors
        setError(Object.values(errors).flat()[0] ?? 'Dati non validi.')
        return
      }
      if (!res.ok) {
        setError(`Operazione non riuscita (${res.status}).`)
        return
      }
      const json = body as CampaignWrapped
      if (!json?.data?.slug) {
        setError('Risposta imprevista dal server.')
        return
      }
      navigate(`/campaigns/${json.data.slug}`, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Richiesta non riuscita.'
      setError(message)
    } finally {
      setPending(false)
    }
  }

  if (authLoading) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={28} width="50%" />
        <Skeleton height={400} radius="lg" />
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
              Accedi per creare una bozza: potrai impostare prezzi dinamici, obiettivo persone e ripartizione dei costi.
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
        <Title order={2}>Nuova campagna</Title>
        <Alert color="orange" title="Account sostenitore" variant="light">
          Il tuo profilo non ha il ruolo creator. Registra un nuovo utente con l’opzione «Voglio creare campagne» oppure
          usa un account operatore.
        </Alert>
        <Button component={Link} to="/register" variant="light">
          Vai alla registrazione
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
          Nuova campagna
        </Text>
      </Breadcrumbs>

      <Stack gap="xs">
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          Nuova campagna (bozza)
        </Title>
        <Text c="dimmed" maw={720} lh={1.65}>
          Compila i campi: la campagna nasce in bozza. Potrai inviarla in revisione dalla scheda quando sei pronto.
        </Text>
      </Stack>

      <Paper component="form" onSubmit={(e) => void onSubmit(e)} withBorder radius="lg" p={{ base: 'md', sm: 'xl' }} shadow="sm">
        <Stack gap="lg">
          <TextInput
            label="Titolo"
            description="Massimo 160 caratteri."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            radius="md"
          />
          <TextInput
            label="Riassunto (opzionale)"
            description="Breve sottotitolo per card e liste."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={500}
            radius="md"
          />
          <Textarea
            label="Descrizione"
            description="Almeno 50 caratteri."
            placeholder={DESCRIPTION_PLACEHOLDER}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={50}
            autosize
            minRows={5}
            radius="md"
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Categoria"
              placeholder="Scegli…"
              data={CATEGORY_OPTIONS}
              value={category ?? ''}
              onChange={setCategory}
              clearable
              radius="md"
            />
            <TextInput
              label="Valuta (ISO 4217)"
              description="Es. EUR"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              required
              maxLength={3}
              radius="md"
            />
          </SimpleGrid>

          <NumberInput
            label="Obiettivo sostenitori"
            description="Numero di persone da raggiungere."
            value={targetSupporters}
            onChange={(v) => setTargetSupporters(v ?? '')}
            min={1}
            required
            radius="md"
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Prezzo minimo (centesimi)"
              description="Quota pavimento per partecipante."
              value={minPriceCents}
              onChange={(v) => setMinPriceCents(v ?? '')}
              min={1}
              required
              radius="md"
            />
            <NumberInput
              label="Prezzo massimo (centesimi)"
              description="Quota al primo ingresso / picco."
              value={maxPriceCents}
              onChange={(v) => setMaxPriceCents(v ?? '')}
              min={1}
              required
              radius="md"
            />
          </SimpleGrid>

          <Divider label="Voci di costo (centesimi)" labelPosition="left" />
          <Text size="sm" c="dimmed">
            La somma delle voci definisce l’obiettivo economico totale della campagna (ripartito sulle quote dinamiche).
          </Text>

          <Stack gap="sm">
            {costRows.map((row, i) => (
              <Group key={i} align="flex-end" wrap="wrap" gap="sm">
                <TextInput
                  placeholder="Voce (es. Noleggio)"
                  value={row.label}
                  onChange={(e) => updateCostRow(i, { label: e.target.value })}
                  style={{ flex: '1 1 200px' }}
                  radius="md"
                />
                <NumberInput
                  placeholder="Importo centesimi"
                  value={row.amount_cents}
                  onChange={(v) => updateCostRow(i, { amount_cents: String(v ?? '') })}
                  min={1}
                  style={{ flex: '0 1 160px' }}
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

          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={pending} color="teal" size="md">
              Crea bozza
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
