import { useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Code,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type SimulationResult = {
  ok: boolean
  message?: string
  campaign_slug?: string
  steps_requested?: number
  cancel_probability?: number
  stay_below_bloom?: boolean
  reservations_created?: number
  reservations_cancelled?: number
  supporters_created?: number
  steps_skipped_no_op?: number
  errors?: Array<{ step: number; operation: string; message: string }>
  duration_ms?: number
  campaign_after?: Record<string, unknown>
}

export default function BackofficeSimulationPage(): ReactElement {
  const { user } = useAuth()
  const [slug, setSlug] = useState('')
  const [steps, setSteps] = useState<number | string>(80)
  const [cancelProbability, setCancelProbability] = useState<number | string>(0.3)
  const [stayBelowBloom, setStayBelowBloom] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)

  if (!user || user.role !== 'admin') {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Simulazione carico</Title>
        <Text c="dimmed">Solo gli account amministratore possono usare questo strumento.</Text>
        <Anchor component={Link} to="/backoffice">
          Torna al backoffice
        </Anchor>
      </Stack>
    )
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setResult(null)
    const s = slug.trim()
    if (!s) {
      setError('Indica lo slug della campagna.')
      return
    }
    const st = Number(steps)
    const cp = Number(cancelProbability)
    if (!Number.isFinite(st) || st < 1) {
      setError('Passi non validi.')
      return
    }
    if (!Number.isFinite(cp) || cp < 0 || cp > 1) {
      setError('Probabilità annullo: usa un numero tra 0 e 1.')
      return
    }

    setPending(true)
    try {
      const res = await apiFetch('/api/v1/backoffice/simulations/reservation-load', {
        method: 'POST',
        json: {
          campaign_slug: s,
          steps: st,
          cancel_probability: cp,
          stay_below_bloom: stayBelowBloom,
        },
      })
      const raw = await res.text()
      let parsed: SimulationResult | null = null
      try {
        parsed = raw === '' ? null : (JSON.parse(raw) as SimulationResult)
      } catch {
        parsed = null
      }
      if (res.status === 404) {
        setError(
          'Simulazione non disponibile (disattivata in configurazione o ambiente). Verifica SIMULATION_ENABLED / APP_ENV.',
        )
        return
      }
      if (res.status === 403) {
        setError('Permesso negato.')
        return
      }
      if (!res.ok || !parsed) {
        setError(`Richiesta non riuscita (${res.status}).`)
        return
      }
      setResult(parsed)
      if (!parsed.ok && parsed.message) {
        setError(parsed.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack gap="xl" py="lg" maw={720}>
      <Stack gap="xs">
        <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
          Simulazione prenotazioni
        </Title>
        <Text c="dimmed" size="sm" lh={1.65}>
          Genera supporter fittizi e alterna creazione e annullo prenotazioni sulla campagna scelta, usando le stesse
          regole del prodotto (pre-Bloom). Le email non partono durante la run. Non usare su produzione con dati reali:
          crea molti utenti nel database.
        </Text>
      </Stack>

      <Paper component="form" onSubmit={(e) => void onSubmit(e)} withBorder radius="lg" p="lg" shadow="sm">
        <Stack gap="md">
          <TextInput
            label="Slug campagna"
            placeholder="es. la-mia-campagna-pubblicata"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            radius="md"
          />
          <NumberInput
            label="Numero di passi"
            description="Ogni passo tenta un annullo (con la probabilità sotto) oppure una nuova prenotazione, se c’è spazio."
            value={steps}
            onChange={setSteps}
            min={1}
            max={10_000}
            radius="md"
          />
          <NumberInput
            label="Probabilità annullo (0–1)"
            value={cancelProbability}
            onChange={setCancelProbability}
            min={0}
            max={1}
            step={0.05}
            decimalScale={2}
            radius="md"
          />
          <Checkbox
            label="Resta sotto il Bloom"
            description="Non supera mai target_supporters − 1 prenotazioni attive, così gli annulli restano sempre possibili."
            checked={stayBelowBloom}
            onChange={(e) => setStayBelowBloom(e.currentTarget.checked)}
          />
          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}
          <Button type="submit" loading={pending} color="teal">
            Esegui simulazione
          </Button>
        </Stack>
      </Paper>

      {result && result.ok ? (
        <Paper withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Text fw={600}>Esito</Text>
            <Text size="sm">
              Create: {result.reservations_created ?? 0}, annullate: {result.reservations_cancelled ?? 0}, supporter
              creati: {result.supporters_created ?? 0}, passi senza operazione: {result.steps_skipped_no_op ?? 0},{' '}
              tempo: {result.duration_ms ?? 0} ms
            </Text>
            {(result.errors?.length ?? 0) > 0 ? (
              <Alert color="orange" variant="light" title="Errori parziali su alcuni passi">
                <Code block>{JSON.stringify(result.errors, null, 2)}</Code>
              </Alert>
            ) : null}
            <Code block>{JSON.stringify(result.campaign_after ?? {}, null, 2)}</Code>
          </Stack>
        </Paper>
      ) : null}

      <Anchor component={Link} to="/backoffice" size="sm">
        ← Dashboard backoffice
      </Anchor>
    </Stack>
  )
}
