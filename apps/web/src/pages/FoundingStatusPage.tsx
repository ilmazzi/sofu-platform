import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Group, NumberInput, Stack, Text, Title } from '@mantine/core'
import {
  IconCheck,
  IconCreditCard,
  IconPlus,
  IconStack2,
  IconWallet,
} from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { FoundingBrand } from '../founding/FoundingBrand'
import { FoundingCampaignPulse } from '../founding/FoundingCampaignPulse'
import { FoundingCostBreakdown } from '../founding/FoundingCostBreakdown'
import { FoundingShell } from '../founding/FoundingShell'
import { founding } from '../founding/theme'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'
import { reservationStatusLabel } from '../lib/reservationLabels'

type Campaign = components['schemas']['Campaign']
type Reservation = components['schemas']['Reservation']

const { cream, ink, orange, fontDisplay, fontBody } = founding

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
  const [extraDrops, setExtraDrops] = useState<number | string>(1)

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
    const n = typeof extraDrops === 'number' ? extraDrops : Number(extraDrops)
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
              Il tuo impegno
            </Title>
          </Stack>

          {message ? (
            <Alert color="teal" variant="filled">
              {message}
            </Alert>
          ) : null}
          {error ? (
            <Alert color="red" variant="filled">
              {error}
            </Alert>
          ) : null}

          {campaign ? <FoundingCampaignPulse campaign={campaign} accent={orange} /> : null}

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
            }}
          >
            {authLoading || !loaded ? (
              <Text size="sm" style={{ fontFamily: fontBody }}>
                Caricamento…
              </Text>
            ) : !reservation ? (
              <Stack gap="md">
                <Text size="sm" style={{ fontFamily: fontBody }}>
                  Non hai ancora una promessa attiva su questa campagna.
                </Text>
                <Button component={Link} to="/sostieni" color="dark">
                  Sostieni SoFu
                </Button>
              </Stack>
            ) : (
              <Stack gap="md" className="founding-fade-up">
                <Title order={2} fz="1.35rem" style={{ fontFamily: fontDisplay }}>
                  La tua adesione
                </Title>
                <Group gap="sm">
                  <IconCheck size={18} stroke={1.75} />
                  <Text size="sm" style={{ fontFamily: fontBody }}>
                    Stato: <strong>{reservationStatusLabel(reservation.status)}</strong>
                  </Text>
                </Group>
                <Group gap="sm">
                  <IconStack2 size={18} stroke={1.75} />
                  <Text size="sm" style={{ fontFamily: fontBody }}>
                    Quote promesse: <strong>{reservation.drop_count}</strong>
                  </Text>
                </Group>
                <Group gap="sm">
                  <IconWallet size={18} stroke={1.75} />
                  <Text size="sm" style={{ fontFamily: fontBody }}>
                    Impegno registrato:{' '}
                    <strong>
                      {formatEuro(reservation.effective_price_cents, campaign?.currency ?? 'EUR')}
                    </strong>
                  </Text>
                </Group>
                {reservation.payment_method_verified_at ? (
                  <Group gap="sm">
                    <IconCreditCard size={18} stroke={1.75} />
                    <Text size="sm" c="dimmed" style={{ fontFamily: fontBody }}>
                      Carta verificata il{' '}
                      {new Date(reservation.payment_method_verified_at).toLocaleString('it-IT')}
                    </Text>
                  </Group>
                ) : null}

                <Box pt="sm">
                  <Group gap={6} mb="xs">
                    <IconPlus size={16} stroke={1.75} />
                    <Text fw={600} style={{ fontFamily: fontBody }}>
                      Aumenta le quote
                    </Text>
                  </Group>
                  <Group align="flex-end" gap="sm" wrap="wrap">
                    <NumberInput
                      label="Quote da aggiungere"
                      min={1}
                      max={10000}
                      value={extraDrops}
                      onChange={setExtraDrops}
                      w={160}
                    />
                    <Button color="dark" loading={pending} onClick={() => void onAddDrops()}>
                      Aggiungi
                    </Button>
                  </Group>
                </Box>

                <Button
                  variant="outline"
                  color="red"
                  loading={pending}
                  onClick={() => void onCancel()}
                  mt="sm"
                >
                  Ritira la promessa
                </Button>
              </Stack>
            )}
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
