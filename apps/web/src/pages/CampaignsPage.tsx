import { type ReactElement, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { components } from '@sofu/contracts'
import { CampaignFeedCard } from '../components/CampaignFeedCard'
import { apiFetch } from '../lib/api/client'

type Campaign = components['schemas']['Campaign']

type SortOption = 'most-active' | 'newest' | 'price-low' | 'price-high' | 'almost-complete'

const SORT_OPTIONS = [
  { value: 'most-active', label: 'Più attive' },
  { value: 'newest', label: 'Più recenti' },
  { value: 'price-low', label: 'Prezzo più basso' },
  { value: 'price-high', label: 'Prezzo più alto' },
  { value: 'almost-complete', label: 'Quasi complete' },
]

const CATEGORY_OPTIONS = [
  { value: 'tech', label: 'Tecnologia' },
  { value: 'art', label: 'Arte' },
  { value: 'music', label: 'Musica' },
  { value: 'film', label: 'Film' },
  { value: 'games', label: 'Giochi' },
  { value: 'food', label: 'Cibo' },
  { value: 'fashion', label: 'Moda' },
  { value: 'design', label: 'Design' },
  { value: 'publishing', label: 'Editoria' },
]

const STATUS_OPTIONS = [
  { value: 'published', label: 'Pubblicate' },
  { value: 'activated', label: 'Attive' },
  { value: 'successful', label: 'Completate' },
  { value: 'closed', label: 'Chiuse' },
]

export default function CampaignsPage(): ReactElement {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['published', 'activated'])
  const [sortBy, setSortBy] = useState<SortOption>('most-active')

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

  // Filtra e ordina campagne
  const filteredAndSortedCampaigns = campaigns
    ? campaigns
        .filter((c) => {
          // Filtro ricerca
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            const matchTitle = c.title.toLowerCase().includes(query)
            const matchDesc = c.description?.toLowerCase().includes(query)
            const matchSummary = c.summary?.toLowerCase().includes(query)
            if (!matchTitle && !matchDesc && !matchSummary) return false
          }
          // Filtro categoria
          if (selectedCategories.length > 0 && !selectedCategories.includes(c.category || '')) return false
          // Filtro status
          if (selectedStatuses.length > 0 && !selectedStatuses.includes(c.status)) return false
          return true
        })
        .sort((a, b) => {
          switch (sortBy) {
            case 'most-active':
              return b.active_reservations_count - a.active_reservations_count
            case 'newest':
              return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
            case 'price-low':
              return a.current_price_cents - b.current_price_cents
            case 'price-high':
              return b.current_price_cents - a.current_price_cents
            case 'almost-complete':
              const pctA = (a.active_reservations_count / a.target_supporters) * 100
              const pctB = (b.active_reservations_count / b.target_supporters) * 100
              return pctB - pctA
            default:
              return 0
          }
        })
    : []

  const handleResetFilters = (): void => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedStatuses(['published', 'activated'])
    setSortBy('most-active')
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategories.length > 0 ||
    selectedStatuses.length !== 2 ||
    sortBy !== 'most-active'

  const toggleCategory = (cat: string): void => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const toggleStatus = (status: string): void => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  return (
    <Box py="md">
      <Grid>
        {/* Sidebar filtri */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Box
            style={{
              position: 'sticky',
              top: 16,
            }}
          >
            <Stack gap="xl">
              {/* Header filtri */}
              <div>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="xs">
                  Filtri
                </Text>
                <Title order={3} fw={600} style={{ letterSpacing: '-0.02em' }}>
                  Cerca campagne
                </Title>
              </div>

              {/* Ricerca */}
              <TextInput
                placeholder="Cerca per titolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                styles={{
                  input: {
                    border: '1px solid #dee2e6',
                    '&:focus': {
                      borderColor: '#495057',
                    },
                  },
                }}
              />

              {/* Categoria */}
              <div>
                <Text size="sm" fw={600} mb="sm" c="dark">
                  Categoria
                </Text>
                <Stack gap="xs">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <Checkbox
                      key={cat.value}
                      label={cat.label}
                      checked={selectedCategories.includes(cat.value)}
                      onChange={() => toggleCategory(cat.value)}
                      styles={{
                        label: {
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          cursor: 'pointer',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </div>

              {/* Status */}
              <div>
                <Text size="sm" fw={600} mb="sm" c="dark">
                  Stato
                </Text>
                <Stack gap="xs">
                  {STATUS_OPTIONS.map((status) => (
                    <Checkbox
                      key={status.value}
                      label={status.label}
                      checked={selectedStatuses.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      styles={{
                        label: {
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          cursor: 'pointer',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </div>

              {/* Reset */}
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  color="dark"
                  size="sm"
                  fullWidth
                  onClick={handleResetFilters}
                  style={{
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                  }}
                >
                  Reset filtri
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Grid.Col>

        {/* Contenuto principale */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="xl">
            {/* Header */}
            <Box style={{ borderBottom: '1px solid #dee2e6' }} pb="lg">
              <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <div>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }} mb="xs">
                    Esplora
                  </Text>
                  <Title order={1} fw={600} style={{ letterSpacing: '-0.03em' }}>
                    Tutte le campagne
                  </Title>
                  <Text size="sm" c="dimmed" mt={4} fw={400}>
                    {campaigns === null
                      ? 'Caricamento...'
                      : `${filteredAndSortedCampaigns.length} ${filteredAndSortedCampaigns.length === 1 ? 'campagna' : 'campagne'}`}
                  </Text>
                </div>
                <Select
                  data={SORT_OPTIONS}
                  value={sortBy}
                  onChange={(val) => setSortBy((val as SortOption) || 'most-active')}
                  style={{ minWidth: 200 }}
                  styles={{
                    input: {
                      border: '1px solid #dee2e6',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </Group>
            </Box>

            {error ? (
              <Alert color="red" title="Errore" variant="light">
                {error}
              </Alert>
            ) : null}

            {/* Grid campagne */}
            {campaigns === null ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={480} />
                ))}
              </SimpleGrid>
            ) : filteredAndSortedCampaigns.length === 0 ? (
              <Box
                p="xl"
                ta="center"
                style={{
                  border: '1px solid #dee2e6',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <Stack gap="md" align="center" maw={480} mx="auto">
                  <Text size="xl" fw={600} c="dark">
                    Nessuna campagna trovata
                  </Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    {hasActiveFilters
                      ? 'Prova a modificare i filtri o la ricerca per trovare altre campagne.'
                      : 'Non ci sono campagne pubblicate al momento. Torna più tardi per scoprire nuovi progetti.'}
                  </Text>
                  {hasActiveFilters ? (
                    <Button
                      variant="outline"
                      color="dark"
                      size="md"
                      onClick={handleResetFilters}
                      style={{
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                      }}
                    >
                      Reset filtri
                    </Button>
                  ) : null}
                </Stack>
              </Box>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                {filteredAndSortedCampaigns.map((c) => (
                  <CampaignFeedCard key={c.id} c={c} />
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Box>
  )
}
