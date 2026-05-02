import type { ReactElement } from 'react'
import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { campaignCategoryLabel, campaignStatusBadgeColor, campaignStatusLabel } from '../lib/campaignLabels'
import { supporterProgressPercent } from '../lib/campaignMetrics'
import { CampaignGrowthPlant } from './CampaignGrowthPlant'
import { CampaignCoverImage } from './CampaignCoverImage'
import { CampaignMetricsBlock } from './CampaignMetricsBlock'

type Campaign = components['schemas']['Campaign']

export function CampaignFeedCard({ c }: { c: Campaign }): ReactElement {
  const desc = c.description?.trim()
  const blurb =
    c.summary?.trim() ||
    (desc ? desc.slice(0, 130) : '') ||
    'Apri la scheda per obiettivi, costi e tutti i dettagli.'

  const cat = campaignCategoryLabel(c.category)

  return (
    <Card
      withBorder
      padding={0}
      radius="lg"
      shadow="md"
      component={Link}
      to={`/campaigns/${c.slug}`}
      styles={{
        root: {
          textDecoration: 'none',
          color: 'inherit',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 'var(--mantine-shadow-xl)',
          },
        },
      }}
    >
      <Card.Section>
        <CampaignCoverImage slug={c.slug} title={c.title} height={176} />
      </Card.Section>

      <Stack gap="sm" p="md" style={{ flex: 1 }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Badge variant="light" color={campaignStatusBadgeColor(c.status)} size="sm" tt="none" fw={600}>
              {campaignStatusLabel(c.status)}
            </Badge>
            {cat ? (
              <Badge variant="outline" color="gray" size="sm" tt="none">
                {cat}
              </Badge>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed" fw={600}>
            {c.currency}
          </Text>
        </Group>

        <Title order={4} lineClamp={2} style={{ letterSpacing: '-0.02em' }}>
          {c.title}
        </Title>
        <Text size="sm" c="dimmed" lineClamp={2} lh={1.55}>
          {blurb}
        </Text>

        <CampaignGrowthPlant progressPercent={supporterProgressPercent(c)} variant="compact" />

        <div style={{ marginTop: 'auto' }}>
          <CampaignMetricsBlock c={c} compact />
        </div>
      </Stack>
    </Card>
  )
}
