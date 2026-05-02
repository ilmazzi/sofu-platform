import { type ReactElement, useEffect, useState } from 'react'
import { Alert, Button, Card, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { CampaignFeedCard } from '../components/CampaignFeedCard'
import { HomeHero } from '../components/HomeHero'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type Campaign = components['schemas']['Campaign']

export default function HomePage(): ReactElement {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/campaigns')
        if (!res.ok) {
          if (!cancelled) setError(`Impossibile caricare le campagne (${res.status}).`)
          return
        }
        const json = (await res.json()) as { data: Campaign[] }
        if (!cancelled) {
          setCampaigns(json.data)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Errore di rete. Controlla la connessione e che l’API sia avviata.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Stack gap="xl">
      <HomeHero authLoading={authLoading} user={user} />

      {error ? (
        <Alert color="red" title="Caricamento campagne" variant="light">
          {error}
        </Alert>
      ) : null}

      {campaigns === null ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} withBorder padding={0} radius="lg" shadow="sm">
              <Skeleton height={176} />
              <Stack p="md" gap="md">
                <Skeleton height={14} width="55%" />
                <Skeleton height={22} width="90%" />
                <Skeleton height={40} />
                <Skeleton height={8} />
                <Skeleton height={8} />
                <Skeleton height={56} />
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : campaigns.length === 0 ? (
        <Card withBorder padding="xl" radius="lg" shadow="sm" ta="center">
          <Stack gap="md" align="center" maw={440} mx="auto">
            <Text size="3rem" aria-hidden>
              ✦
            </Text>
            <Title order={3}>Nessuna campagna pubblica al momento</Title>
            <Text c="dimmed" lh={1.6}>
              Quando un creator pubblicherà un progetto, comparirà qui con tutti i numeri: sostenitori, prezzo attuale,
              percorso verso il minimo e risparmio rispetto al picco.
            </Text>
            {!user ? (
              <Button component={Link} to="/register" color="brand" size="md">
                Registrati
              </Button>
            ) : null}
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {campaigns.map((c) => (
            <CampaignFeedCard key={c.id} c={c} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
