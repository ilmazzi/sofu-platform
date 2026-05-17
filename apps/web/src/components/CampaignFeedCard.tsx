import type { ReactElement } from 'react'
import { Badge, Box, Group, Progress, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import { campaignHasReachedBloom } from '../lib/bloom'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'
import { CampaignCoverImage } from './CampaignCoverImage'
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

export function CampaignFeedCard({ c }: { c: Campaign }): ReactElement {
  const desc = c.description?.trim()
  const blurb =
    c.summary?.trim() ||
    (desc ? desc.slice(0, 130) : '') ||
    'Apri la scheda per obiettivi, costi e tutti i dettagli.'

  const cat = campaignCategoryLabel(c.category)
  const supPct = supporterProgressPercent(c)
  const stage = growthStageFromSupporterPercent(supPct)
  const bloomed = campaignHasReachedBloom(c)
  const displayPriceCents = bloomed ? c.current_price_cents : c.max_price_cents
  const priceLabel = bloomed ? LABEL_BLOOMING_DROP_CURRENT : LABEL_GROWING_DROP
  const savings = Math.max(0, (c.max_price_cents - c.current_price_cents) / 100)
  const savingsPct = c.max_price_cents > 0 ? Math.round((savings / (c.max_price_cents / 100)) * 100) : 0
  const transparentZeroProfit = hasTransparentZeroProfit(c.cost_items)

  return (
    <Box
      component={Link}
      to={`/campaigns/${c.slug}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        <CampaignCoverImage slug={c.slug} title={c.title} mediaUrls={c.media_urls} height={200} />
        <Box
          pos="absolute"
          inset={0}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />
        <Group pos="absolute" bottom={12} left={12} right={12} justify="space-between" wrap="nowrap" gap="xs">
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

      <Stack gap="md" p="md" style={{ flex: 1 }}>
        <Text size="lg" fw={600} lineClamp={2} lh={1.3} c="dark" style={{ letterSpacing: '-0.02em' }}>
          {c.title}
        </Text>
        <Text size="sm" c="dimmed" lineClamp={2} lh={1.5} fw={400}>
          {blurb}
        </Text>

        {transparentZeroProfit ? (
          <Badge color="teal" variant="light" size="sm" fullWidth style={{ whiteSpace: 'normal', height: 'auto', padding: '6px 10px' }}>
            {ZERO_PROFIT_BADGE}
          </Badge>
        ) : null}

        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Droplets
            </Text>
            <Text size="xs" fw={600} c="dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {c.active_reservations_count} / {c.target_supporters}
            </Text>
          </Group>
          <Progress value={supPct} size="xs" color="dark" styles={{ root: { backgroundColor: '#e9ecef' } }} />
          <Group justify="space-between" mt={6} gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              {stage.label}
            </Text>
            <Text size="xs" fw={600} c="dark">
              {Math.round(supPct)}%
            </Text>
          </Group>
        </Box>

        <Box
          p="sm"
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            marginTop: 'auto',
          }}
        >
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }} mb={2}>
                {priceLabel}
              </Text>
              <Text size="xl" fw={600} c="dark" lh={1} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {formatEuro(displayPriceCents, c.currency)}
              </Text>
            </div>
            {bloomed && savingsPct > 0 ? (
              <Text size="sm" fw={600} c="green.8">
                -{savingsPct}%
              </Text>
            ) : null}
          </Group>
        </Box>
      </Stack>
    </Box>
  )
}
