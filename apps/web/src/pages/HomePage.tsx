import { type ReactElement, useEffect, useState } from 'react'
import { Alert, Box, Button, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { CampaignFeedCard } from '../components/CampaignFeedCard'
import { FeaturedCampaignCard } from '../components/FeaturedCampaignCard'
import { HomeHero } from '../components/HomeHero'
import { PlatformStats } from '../components/PlatformStats'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'

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
        if (!cancelled) setError('Errore di rete. Controlla la connessione e che l\'API sia avviata.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Calcola statistiche
  const totalCampaigns = campaigns?.length ?? 0
  const totalDroplets = campaigns?.reduce((sum, c) => sum + c.active_reservations_count, 0) ?? 0
  const totalSavings = campaigns?.reduce((sum, c) => {
    const savings = Math.max(0, (c.max_price_cents - c.current_price_cents) / 100)
    return sum + savings * c.active_reservations_count
  }, 0) ?? 0

  // Campagne featured: ordina per active_reservations_count desc, prendi top 3
  const featuredCampaigns = campaigns
    ? [...campaigns]
        .sort((a, b) => b.active_reservations_count - a.active_reservations_count)
        .slice(0, 3)
    : []

  // Ultime pubblicate: ordina per published_at desc, prendi 4
  const latestCampaigns = campaigns
    ? [...campaigns]
        .filter((c) => c.published_at)
        .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())
        .slice(0, 4)
    : []

  return (
    <Stack gap="xl">
      <HomeHero authLoading={authLoading} user={user} />

      {error ? (
        <Alert color="red" title="Caricamento campagne" variant="light">
          {error}
        </Alert>
      ) : null}

      {campaigns === null ? (
        <Stack gap="xl">
          <Skeleton height={180} radius="lg" />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={420} radius="lg" />
            ))}
          </SimpleGrid>
        </Stack>
      ) : campaigns.length === 0 ? (
        <Alert color="blue" title="Nessuna campagna" variant="light">
          <Text>
            Quando un creator pubblicherà un progetto, comparirà qui con tutti i numeri: droplets, prezzo attuale,
            percorso verso il minimo e risparmio rispetto al picco.
          </Text>
          {!user ? (
            <Button component={Link} to="/register" color="brand" size="md" mt="md">
              Registrati
            </Button>
          ) : null}
        </Alert>
      ) : (
        <>
          {/* Statistiche piattaforma */}
          <PlatformStats
            stats={[
              {
                value: totalCampaigns.toString(),
                label: 'Campagne',
                sublabel: 'attive',
                color: 'teal.7',
              },
              {
                value: totalDroplets.toLocaleString('it-IT'),
                label: 'Droplets',
                sublabel: 'totali',
                color: 'blue.7',
              },
              {
                value: formatEuro(Math.round(totalSavings * 100), 'EUR'),
                label: 'Risparmiato',
                sublabel: 'dalla comunità',
                color: 'green.7',
              },
            ]}
          />

          {/* Campagne più attive */}
          {featuredCampaigns.length > 0 ? (
            <Stack gap="xl" mt="xl">
              <div>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="xs">
                  In evidenza
                </Text>
                <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
                  Campagne più attive
                </Title>
                <Text size="sm" c="dimmed" mt={8} fw={400} lh={1.6}>
                  Le campagne con più droplets: unisciti alla comunità e fai scendere il prezzo.
                </Text>
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
                {featuredCampaigns.map((c, i) => {
                  const supPct = (c.active_reservations_count / c.target_supporters) * 100
                  const type = i === 0 ? 'hot' : supPct >= 80 ? 'almost-complete' : 'trending'
                  return <FeaturedCampaignCard key={c.id} c={c} featuredType={type} />
                })}
              </SimpleGrid>
            </Stack>
          ) : null}

          {/* Ultime pubblicate */}
          {latestCampaigns.length > 0 ? (
            <Stack gap="xl" mt="3rem">
              <div>
                <Box style={{ borderTop: '1px solid #dee2e6' }} pt="xl" mb="lg" />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="xs">
                  Recenti
                </Text>
                <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
                  Ultime pubblicate
                </Title>
                <Text size="sm" c="dimmed" mt={8} fw={400} lh={1.6}>
                  I progetti appena lanciati: entra per primo e guarda il prezzo scendere.
                </Text>
              </div>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {latestCampaigns.map((c) => (
                  <CampaignFeedCard key={c.id} c={c} />
                ))}
              </SimpleGrid>
              <Box ta="center" mt="md">
                <Button 
                  component={Link} 
                  to="/campaigns" 
                  variant="outline" 
                  color="dark"
                  size="md"
                  style={{
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontSize: '0.7rem'
                  }}
                >
                  Vedi tutte le campagne
                </Button>
              </Box>
            </Stack>
          ) : null}
        </>
      )}
    </Stack>
  )
}
