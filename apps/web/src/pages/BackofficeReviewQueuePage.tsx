import { useEffect, useState, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { CampaignCoverImage } from '../components/CampaignCoverImage'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'

type BackofficeCampaign = components['schemas']['BackofficeCampaign']
type Paginated = { data: BackofficeCampaign[] }

function ReviewQueueRow({ c }: { c: BackofficeCampaign }): ReactElement {
  const cat = campaignCategoryLabel(c.category)

  return (
    <Paper
      component={Link}
      to={`/campaigns/${c.slug}`}
      withBorder
      radius="lg"
      shadow="sm"
      p={0}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      styles={{
        root: {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--mantine-shadow-md)',
          },
        },
      }}
    >
      <Group wrap="nowrap" align="stretch" gap={0}>
        <Box w={{ base: 120, sm: 168 }} mih={112} style={{ flexShrink: 0, overflow: 'hidden' }}>
          <CampaignCoverImage slug={c.slug} title={c.title} height={112} />
        </Box>
        <Stack gap="sm" p="md" style={{ flex: 1, minWidth: 0 }} justify="center">
          <Group gap="xs" wrap="wrap">
            <Badge variant="light" color={campaignStatusBadgeColor(c.status)} size="sm" tt="none" fw={600}>
              {campaignStatusLabel(c.status)}
            </Badge>
            {cat ? (
              <Badge variant="outline" color="gray" size="sm" tt="none">
                {cat}
              </Badge>
            ) : null}
          </Group>
          <Title order={4} lineClamp={2} style={{ letterSpacing: '-0.02em' }}>
            {c.title}
          </Title>
          <Text size="xs" c="dimmed" ff="monospace">
            {c.slug}
          </Text>
          {c.creator ? (
            <Text size="sm" c="dimmed">
              Creator: <strong>{c.creator.name}</strong> ({c.creator.email})
            </Text>
          ) : null}
          <Text size="xs" c="teal" fw={600}>
            Apri la scheda → Approva o Rifiuta
          </Text>
        </Stack>
      </Group>
    </Paper>
  )
}

export default function BackofficeReviewQueuePage(): ReactElement {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<BackofficeCampaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allowed = user?.role === 'operator' || user?.role === 'admin'

  useEffect(() => {
    if (authLoading || !user || !allowed) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/backoffice/campaigns/in-review')
        const json = (await res.json()) as Paginated
        if (cancelled) return
        if (res.status === 403) {
          setError('Serve un account operatore o amministratore.')
          return
        }
        if (res.status === 401) {
          setError('Sessione non valida: accedi di nuovo.')
          return
        }
        if (!res.ok) {
          setError(`Impossibile caricare la coda (${res.status}).`)
          return
        }
        setRows(json.data)
        setError(null)
      } catch {
        if (!cancelled) setError('Errore di rete.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, allowed])

  if (authLoading) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="55%" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={120} radius="lg" />
        ))}
      </Stack>
    )
  }

  if (!user) {
    return (
      <Stack gap="lg" py="md">
        <Card withBorder padding="xl" radius="lg" shadow="sm">
          <Stack gap="md" maw={480}>
            <Title order={3}>Revisioni campagne</Title>
            <Text c="dimmed" lh={1.6}>
              Accedi con un profilo operatore o amministratore per vedere le campagne in attesa di approvazione.
            </Text>
            <Button component={Link} to="/login" color="teal" w="fit-content">
              Accedi
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  if (!allowed) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Revisioni</Title>
        <Alert color="orange" title="Accesso riservato" variant="light">
          Quest’area è dedicata a operatori e amministratori.
        </Alert>
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          ← Torna alle campagne
        </Anchor>
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Campagne in revisione</Title>
        <Alert color="red" variant="light">
          {error}
        </Alert>
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          ← Torna alle campagne
        </Anchor>
      </Stack>
    )
  }

  if (!rows) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="50%" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={112} radius="lg" />
        ))}
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
          Revisioni
        </Text>
      </Breadcrumbs>

      <Stack gap="xs">
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          Campagne in revisione
        </Title>
        <Text c="dimmed" maw={720} lh={1.65}>
          Apri ogni scheda campagna per usare <strong>Approva</strong> o <strong>Rifiuta</strong> (azioni sulla pagina
          dettaglio, non in questa lista).
        </Text>
      </Stack>

      {rows.length === 0 ? (
        <Card withBorder padding="xl" radius="lg" shadow="sm" ta="center">
          <Stack gap="md" align="center" maw={440} mx="auto">
            <Text size="3rem" aria-hidden>
              ✓
            </Text>
            <Title order={3}>Nessuna campagna in attesa</Title>
            <Text c="dimmed" lh={1.6}>
              Quando un creator invierà una bozza in revisione, comparirà qui con titolo, slug e dati del creator.
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {rows.map((c) => (
            <ReviewQueueRow key={c.id} c={c} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
