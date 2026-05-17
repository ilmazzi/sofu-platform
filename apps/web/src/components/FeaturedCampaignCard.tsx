import type { ReactElement } from 'react'
import { Badge, Box, Group, Progress, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { CampaignCoverImage } from './CampaignCoverImage'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import { campaignHasReachedBloom } from '../lib/bloom'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'
import { growthStageFromSupporterPercent } from '../lib/campaignGrowthStages'
import {
  hasTransparentZeroProfit,
  ZERO_PROFIT_BADGE,
} from '../lib/campaignCosts'
import {
  LABEL_BLOOMING_DROP_CURRENT,
  LABEL_GROWING_DROP,
} from '../lib/dropMechanics'

type Campaign = components['schemas']['Campaign']

type FeaturedBadge = 'hot' | 'trending' | 'almost-complete' | 'new'

function getBadgeConfig(type: FeaturedBadge): { label: string; color: string } {
  switch (type) {
    case 'hot':
      return { label: 'Più attiva', color: 'red' }
    case 'trending':
      return { label: 'In crescita', color: 'orange' }
    case 'almost-complete':
      return { label: 'Quasi completa', color: 'yellow' }
    case 'new':
      return { label: 'Nuova', color: 'blue' }
  }
}

export function FeaturedCampaignCard({
  c,
  featuredType,
}: {
  c: Campaign
  featuredType?: FeaturedBadge
}): ReactElement {
  const cat = campaignCategoryLabel(c.category)
  const supPct = supporterProgressPercent(c)
  const stage = growthStageFromSupporterPercent(supPct)
  const bloomed = campaignHasReachedBloom(c)
  const displayPriceCents = bloomed ? c.current_price_cents : c.max_price_cents
  const priceLabel = bloomed ? LABEL_BLOOMING_DROP_CURRENT : LABEL_GROWING_DROP
  const savings = Math.max(0, (c.max_price_cents - c.current_price_cents) / 100)
  const savingsPct = c.max_price_cents > 0 ? Math.round((savings / (c.max_price_cents / 100)) * 100) : 0
  const transparentZeroProfit = hasTransparentZeroProfit(c.cost_items)

  const badge = featuredType ? getBadgeConfig(featuredType) : null

  return (
    <Box
      component={Link}
      to={`/campaigns/${c.slug}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        border: '1px solid #dee2e6',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#495057'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#dee2e6'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <Box pos="relative">
        <CampaignCoverImage slug={c.slug} title={c.title} mediaUrls={c.media_urls} height={240} />
        <Box
          pos="absolute"
          inset={0}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />
        {badge ? (
          <Badge
            pos="absolute"
            top={16}
            left={16}
            size="sm"
            variant="filled"
            color={badge.color}
            tt="uppercase"
            style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.65rem' }}
          >
            {badge.label}
          </Badge>
        ) : null}
        <Group pos="absolute" bottom={16} left={16} right={16} justify="space-between" wrap="nowrap" gap="xs">
          <Badge 
            variant="filled" 
            color={campaignStatusBadgeColor(c.status)} 
            size="xs" 
            tt="uppercase" 
            style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.6rem' }}
          >
            {campaignStatusLabel(c.status)}
          </Badge>
          {cat ? (
            <Badge 
              variant="outline" 
              size="xs" 
              tt="uppercase" 
              style={{ 
                borderColor: 'rgba(255,255,255,0.8)', 
                color: 'white', 
                backgroundColor: 'rgba(0,0,0,0.3)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                fontSize: '0.6rem'
              }}
            >
              {cat}
            </Badge>
          ) : null}
        </Group>
      </Box>

      <Stack gap="lg" p="xl">
        <div>
          <Text size="xl" fw={600} lh={1.3} c="dark" style={{ letterSpacing: '-0.02em' }}>
            {c.title}
          </Text>
        </div>

        {transparentZeroProfit ? (
          <Badge color="teal" variant="light" size="sm" fullWidth style={{ whiteSpace: 'normal', height: 'auto', padding: '6px 10px' }}>
            {ZERO_PROFIT_BADGE}
          </Badge>
        ) : null}

        <Box>
          <Group justify="space-between" mb={8}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Droplets
            </Text>
            <Text size="xs" fw={600} c="dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {c.active_reservations_count} / {c.target_supporters}
            </Text>
          </Group>
          <Progress value={supPct} size="xs" color="dark" styles={{ root: { backgroundColor: '#e9ecef' } }} />
          <Group justify="space-between" mt={8} gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              {stage.label}
            </Text>
            <Text size="xs" fw={600} c="dark">
              {Math.round(supPct)}%
            </Text>
          </Group>
        </Box>

        <Box
          p="md"
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
          }}
        >
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }} mb={4}>
                {priceLabel}
              </Text>
              <Text size="1.75rem" fw={600} c="dark" lh={1} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {formatEuro(displayPriceCents, c.currency)}
              </Text>
            </div>
            {bloomed && savingsPct > 0 ? (
              <Text size="sm" fw={600} c="green.8">
                -{savingsPct}%
              </Text>
            ) : null}
          </Group>
          {bloomed && savingsPct > 0 ? (
            <Text size="xs" c="dimmed" mt={8} fw={500}>
              Risparmi {formatEuro(Math.round(savings * 100), c.currency)} vs {LABEL_GROWING_DROP}
            </Text>
          ) : !bloomed ? (
            <Text size="xs" c="dimmed" mt={8} fw={500}>
              Fino al Bloom il valore non scende
            </Text>
          ) : null}
        </Box>

        <Text size="xs" c="dimmed" ta="right" fw={500}>
          Obiettivo: {formatEuro(c.total_amount_cents, c.currency)}
        </Text>
      </Stack>
    </Box>
  )
}
