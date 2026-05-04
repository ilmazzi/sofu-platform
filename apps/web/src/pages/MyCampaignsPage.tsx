import { type ReactElement, useEffect, useState } from 'react'
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
  SimpleGrid,
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

type Campaign = components['schemas']['Campaign']
type Paginated = { data: Campaign[] }

function CampaignOwnerRow({ c }: { c: Campaign }): ReactElement {
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
          <CampaignCoverImage slug={c.slug} title={c.title} mediaUrls={c.media_urls} height={112} />
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
            <Text size="xs" c="dimmed" fw={600} ml="auto">
              {c.currency}
            </Text>
          </Group>
          <Title order={4} lineClamp={2} style={{ letterSpacing: '-0.02em' }}>
            {c.title}
          </Title>
          <Group gap="sm" wrap="wrap">
            <Anchor
              component={Link}
              to={`/campaigns/${encodeURIComponent(c.slug)}/edit`}
              size="sm"
              fw={600}
              onClick={(e) => e.stopPropagation()}
            >
              Modifica
            </Anchor>
            <Text size="sm" c="dimmed">
              {c.active_reservations_count} sostenitori · obiettivo {c.target_supporters} persone
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  )
}

export default function MyCampaignsPage(): ReactElement {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/me/campaigns')
        const json = (await res.json()) as Paginated
        if (cancelled) return
        if (res.status === 401) {
          setError('Accedi per vedere le tue campagne.')
          return
        }
        if (!res.ok) {
          setError(`Impossibile caricare l’elenco (${res.status}).`)
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
  }, [authLoading, user])

  if (authLoading) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="45%" />
        <Skeleton height={20} width="70%" />
        <Skeleton height={44} width={200} />
        <SimpleGrid cols={{ base: 1, md: 1 }} spacing="md">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={120} radius="lg" />
          ))}
        </SimpleGrid>
      </Stack>
    )
  }

  if (!user) {
    return (
      <Stack gap="lg" py="md">
        <Card withBorder padding="xl" radius="lg" shadow="sm">
          <Stack gap="md" maw={480}>
            <Title order={3}>Le tue campagne</Title>
            <Text c="dimmed" lh={1.6}>
              Accedi per creare bozze, inviarle in revisione e seguire stato e numeri dopo la pubblicazione.
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
        <Anchor component={Link} to="/campaigns" size="sm" fw={600}>
          ← Torna alle campagne pubbliche
        </Anchor>
      </Stack>
    )
  }

  if (!rows) {
    return (
      <Stack gap="md" py="md">
        <Skeleton height={32} width="40%" />
        <Skeleton height={20} width="65%" />
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
          Create
        </Text>
      </Breadcrumbs>

      <Stack gap="xs">
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          Create
        </Title>
        <Text c="dimmed" maw={640} lh={1.65}>
          Qui trovi tutti gli stati (bozza, revisione, approvata, pubblicata…). L’elenco pubblico mostra solo le campagne
          già pubblicate.
        </Text>
      </Stack>

      <Group>
        <Button component={Link} to="/campaigns/new" color="teal" size="md">
          Nuova campagna
        </Button>
      </Group>

      {rows.length === 0 ? (
        <Card withBorder padding="xl" radius="lg" shadow="sm" ta="center">
          <Stack gap="md" align="center" maw={440} mx="auto">
            <Text size="3rem" aria-hidden>
              ✦
            </Text>
            <Title order={3}>Nessuna campagna ancora</Title>
            <Text c="dimmed" lh={1.6}>
              Crea la prima bozza: potrai definire obiettivo, prezzi dinamici e voci di costo prima di inviarla in
              revisione.
            </Text>
            <Button component={Link} to="/campaigns/new" color="teal" size="md">
              Crea una campagna
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {rows.map((c) => (
            <CampaignOwnerRow key={c.id} c={c} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
