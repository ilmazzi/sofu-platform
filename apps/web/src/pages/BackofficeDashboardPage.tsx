import { useEffect, useState, type ReactElement } from 'react'
import { Box, Grid, Paper, Skeleton, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type DashboardStats = {
  total_users: number
  total_campaigns: number
  total_reservations: number
  total_revenue_cents: number
  campaigns_in_review: number
  campaigns_published: number
}

function StatCard({ label, value, loading }: { label: string; value: string | number; loading?: boolean }) {
  return (
    <Paper withBorder p="lg" style={{ borderRadius: 0 }}>
      <Stack gap="xs">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.12em' }}>
          {label}
        </Text>
        {loading ? (
          <Skeleton height={32} width="60%" />
        ) : (
          <Text size="2rem" fw={600} lh={1} style={{ letterSpacing: '-0.03em' }}>
            {value}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}

export default function BackofficeDashboardPage(): ReactElement {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.role || !['operator', 'admin'].includes(user.role)) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/backoffice/stats')
        if (cancelled) return
        if (res.ok) {
          const json = (await res.json()) as DashboardStats
          setStats(json)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user || !['operator', 'admin'].includes(user.role)) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Dashboard</Title>
        <Text c="dimmed">Accesso riservato a operatori e amministratori.</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="xl" py="lg">
      <Box>
        <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
          Dashboard Backoffice
        </Title>
        <Text c="dimmed" size="sm" mt="xs">
          Panoramica delle metriche della piattaforma
        </Text>
      </Box>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard label="Utenti totali" value={stats?.total_users ?? 0} loading={loading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard label="Campagne totali" value={stats?.total_campaigns ?? 0} loading={loading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard label="Droplets totali" value={stats?.total_reservations ?? 0} loading={loading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Revenue totale"
            value={stats ? `€${(stats.total_revenue_cents / 100).toFixed(2)}` : '€0.00'}
            loading={loading}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard label="In revisione" value={stats?.campaigns_in_review ?? 0} loading={loading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard label="Pubblicate" value={stats?.campaigns_published ?? 0} loading={loading} />
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
