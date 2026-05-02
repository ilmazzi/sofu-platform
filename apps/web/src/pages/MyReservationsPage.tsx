import { useEffect, useState, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { StripePaymentForm } from '../components/StripePaymentForm'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'
import { reservationStatusLabel } from '../lib/reservationLabels'

type Reservation = components['schemas']['Reservation']
type Payment = components['schemas']['Payment']
type Paginated = {
  data: Reservation[]
  meta: { current_page: number; last_page: number; total: number }
}

function reservationNeedsPayment(status: string): boolean {
  return status === 'active'
}

function parseJson(raw: string): unknown {
  if (raw === '') return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function reservationStatusColor(status: string): string {
  if (status === 'converted_to_payment') return 'teal'
  if (status === 'active') return 'blue'
  if (status === 'failed') return 'red'
  if (status === 'cancelled' || status === 'expired') return 'gray'
  return 'yellow'
}

export default function MyReservationsPage(): ReactElement {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const paymentJustSucceeded = searchParams.get('payment') === 'success'

  const [rows, setRows] = useState<Reservation[] | null>(null)
  const [meta, setMeta] = useState<Paginated['meta'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentById, setPaymentById] = useState<Record<string, Payment | 'pending' | 'error'>>({})
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (authLoading || !user) {
      return
    }
    let cancelled = false
    void (async () => {
      setError(null)
      try {
        const res = await apiFetch(`/api/v1/me/reservations?page=${page}`)
        const raw = await res.text()
        const json = parseJson(raw) as Paginated | null
        if (cancelled) return
        if (res.status === 401) {
          setError('Accedi per vedere le tue prenotazioni.')
          return
        }
        if (!res.ok || !json?.data) {
          setError(`Impossibile caricare le prenotazioni (${res.status}).`)
          return
        }
        setRows(json.data)
        setMeta(json.meta ?? null)
      } catch {
        if (!cancelled) setError('Errore di rete.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, page, reloadKey])

  useEffect(() => {
    if (!paymentJustSucceeded) return
    const t = window.setTimeout(() => {
      navigate(`${location.pathname}${location.hash}`, { replace: true })
    }, 8000)
    return () => window.clearTimeout(t)
  }, [paymentJustSucceeded, navigate, location.pathname, location.hash])

  async function startPayment(reservationId: string): Promise<void> {
    setPaymentById((m) => ({ ...m, [reservationId]: 'pending' }))
    try {
      const res = await apiFetch(`/api/v1/reservations/${reservationId}/payment-intent`, {
        method: 'POST',
        json: {},
      })
      const raw = await res.text()
      const body = parseJson(raw) as { data?: Payment } | null
      if (!res.ok || !body?.data) {
        setPaymentById((m) => ({ ...m, [reservationId]: 'error' }))
        return
      }
      setPaymentById((m) => ({ ...m, [reservationId]: body.data! }))
    } catch {
      setPaymentById((m) => ({ ...m, [reservationId]: 'error' }))
    }
  }

  function retry(): void {
    setError(null)
    setRows(null)
    setMeta(null)
    setReloadKey((k) => k + 1)
  }

  if (authLoading) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="50%" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={140} radius="lg" />
        ))}
      </Stack>
    )
  }

  if (!user) {
    return (
      <Stack gap="lg" py="md">
        <Card withBorder padding="xl" radius="lg" shadow="sm">
          <Stack gap="md" maw={480}>
            <Title order={3}>Le tue prenotazioni</Title>
            <Text c="dimmed" lh={1.6}>
              Accedi per vedere le campagne a cui ti sei iscritto, lo stato del pagamento e completare eventuali quote
              ancora da saldare.
            </Text>
            <Button component={Link} to="/login" color="teal" w="fit-content">
              Accedi
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack gap="md" py="md">
        <Alert color="red" title="Errore" variant="light">
          {error}
        </Alert>
        <Button variant="light" onClick={() => retry()}>
          Riprova
        </Button>
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          ← Vai alle campagne
        </Anchor>
      </Stack>
    )
  }

  if (!rows) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="45%" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={120} radius="lg" />
        ))}
      </Stack>
    )
  }

  return (
    <Stack gap="xl" py={{ base: 'md', sm: 'lg' }} pb="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Stack gap="xs">
          <Title order={2} style={{ letterSpacing: '-0.03em' }}>
            Le mie prenotazioni
          </Title>
          <Text c="dimmed" maw={560} lh={1.65}>
            Stato delle quote, importi effettivi e pagamento. Dopo un pagamento andato a buon fine lo stato si aggiorna
            automaticamente.
          </Text>
        </Stack>
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          Sfoglia campagne →
        </Anchor>
      </Group>

      {paymentJustSucceeded ? (
        <Alert color="teal" title="Pagamento registrato" variant="light">
          Operazione completata correttamente. Grazie per il sostegno.
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <Card withBorder padding="xl" radius="lg" shadow="sm" ta="center">
          <Stack gap="md" align="center" maw={440} mx="auto">
            <Text size="3rem" aria-hidden>
              ✦
            </Text>
            <Title order={3}>Nessuna prenotazione</Title>
            <Text c="dimmed" lh={1.6}>
              Esplora le campagne pubbliche e prenota un posto: qui troverai riepilogo, importo e link per il
              pagamento.
            </Text>
            <Button component={Link} to="/campaigns" color="teal" size="md">
              Vedi le campagne
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack gap="md">
            {rows.map((r) => {
              const slug = r.campaign?.slug
              const pay = paymentById[r.id]
              const title = r.campaign?.title ?? slug ?? 'Campagna'
              return (
                <Paper key={r.id} withBorder radius="lg" p={{ base: 'md', sm: 'lg' }} shadow="sm">
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                      <Stack gap={4} maw="100%">
                        <Group gap="xs" wrap="wrap">
                          <Badge variant="light" color={reservationStatusColor(r.status)} tt="none" fw={600}>
                            {reservationStatusLabel(r.status)}
                          </Badge>
                        </Group>
                        <Title order={4} lineClamp={2} style={{ letterSpacing: '-0.02em' }}>
                          {slug ? (
                            <Anchor component={Link} to={`/campaigns/${slug}`} c="inherit" underline="hover">
                              {title}
                            </Anchor>
                          ) : (
                            title
                          )}
                        </Title>
                        <Text size="sm" c="dimmed">
                          Quota effettiva:{' '}
                          <Text span fw={700} c="dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatEuro(r.effective_price_cents, 'EUR')}
                          </Text>
                        </Text>
                      </Stack>
                    </Group>

                    <Divider />

                    {r.status === 'converted_to_payment' ? (
                      <Alert color="teal" variant="light">
                        Pagamento completato per questa prenotazione.
                      </Alert>
                    ) : r.status === 'failed' ? (
                      <Alert color="red" variant="light">
                        Il pagamento non è andato a buon fine. Puoi riprovare con «Prepara pagamento».
                      </Alert>
                    ) : reservationNeedsPayment(r.status) ? (
                      <Stack gap="sm">
                        <Button type="button" onClick={() => void startPayment(r.id)} loading={pay === 'pending'}>
                          Prepara pagamento
                        </Button>
                        {pay === 'error' ? (
                          <Text size="sm" c="red">
                            Creazione del pagamento non riuscita. Riprova.
                          </Text>
                        ) : null}
                        {pay && pay !== 'pending' && pay !== 'error' ? (
                          <Stack gap="sm">
                            <Text size="sm" c="dimmed">
                              Stato intent: <strong>{pay.status}</strong> — {formatEuro(pay.amount_cents, pay.currency)}
                            </Text>
                            <StripePaymentForm
                              payment={pay}
                              returnNextPath="/me/reservations"
                              onCompleted={() => {
                                setPaymentById((m) => {
                                  const next = { ...m }
                                  delete next[r.id]
                                  return next
                                })
                                setReloadKey((k) => k + 1)
                                window.setTimeout(() => setReloadKey((k) => k + 1), 1200)
                                navigate('/me/reservations?payment=success', { replace: true })
                              }}
                            />
                          </Stack>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>

          {meta && meta.last_page > 1 ? (
            <Group justify="center" mt="md">
              <Pagination total={meta.last_page} value={page} onChange={setPage} size="sm" withEdges />
            </Group>
          ) : null}
        </>
      )}
    </Stack>
  )
}
