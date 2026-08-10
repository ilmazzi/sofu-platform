import type { ReactElement } from 'react'
import { Box, Group, Stack, Text } from '@mantine/core'
import {
  IconCode,
  IconGavel,
  IconHeadset,
  IconSpeakerphone,
  IconShieldLock,
  IconSparkles,
} from '@tabler/icons-react'
import type { components } from '@sofu/contracts'
import { isGuadagnoCostLabel } from '../lib/campaignCosts'
import { formatEuro } from '../lib/campaignMetrics'
import { founding } from './theme'

type CostItem = components['schemas']['CampaignCostItem']

type Props = {
  items: CostItem[] | undefined
  currency?: string
  totalCents?: number | null
  tone?: 'cream' | 'ink'
}

function iconForLabel(label: string): ReactElement {
  const key = label.trim().toLowerCase()
  const props = { size: 18, stroke: 1.7 } as const
  if (key.includes('sviluppo') || key.includes('dev')) return <IconCode {...props} />
  if (key.includes('sicurezza')) return <IconShieldLock {...props} />
  if (key.includes('legal')) return <IconGavel {...props} />
  if (key.includes('marketing') || key.includes('comunicazione')) return <IconSpeakerphone {...props} />
  if (key.includes('server') || key.includes('help')) return <IconHeadset {...props} />
  if (isGuadagnoCostLabel(label)) return <IconSparkles {...props} />
  return <IconSparkles {...props} />
}

export function FoundingCostBreakdown({
  items,
  currency = 'EUR',
  totalCents,
  tone = 'cream',
}: Props): ReactElement | null {
  const rows = [...(items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  if (rows.length === 0) return null

  const sum = rows.reduce((s, r) => s + r.amount_cents, 0)
  const total = totalCents ?? sum
  const onLight = tone === 'cream'
  const ink = onLight ? founding.ink : founding.cream
  const muted = onLight ? 'rgba(26,18,8,0.62)' : 'rgba(247,241,230,0.72)'
  const rule = onLight ? 'rgba(26,18,8,0.12)' : 'rgba(247,241,230,0.22)'
  const guadagnoBg = onLight ? 'rgba(21,96,122,0.1)' : 'rgba(247,241,230,0.12)'
  const iconBg = onLight ? 'rgba(21,96,122,0.1)' : 'rgba(247,241,230,0.14)'

  return (
    <Box component="section" aria-label="Voci di costo della campagna" className="founding-fade-up">
      <Group gap={8} mb="md">
        <IconSparkles size={16} stroke={1.75} color={muted} />
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          style={{ letterSpacing: '0.16em', color: muted, fontFamily: founding.fontBody }}
        >
          Voci di costo
        </Text>
      </Group>
      <Stack gap={0}>
        {rows.map((row, index) => {
          const guadagno = isGuadagnoCostLabel(row.label)
          return (
            <Box
              key={row.id}
              py="sm"
              className={`founding-fade-up founding-fade-up-delay-${Math.min(index + 1, 3)}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '0.75rem',
                alignItems: 'center',
                borderBottom: `1px solid ${rule}`,
                background: guadagno ? guadagnoBg : undefined,
                marginInline: guadagno ? -8 : 0,
                paddingInline: guadagno ? 8 : 0,
                borderRadius: guadagno ? 10 : 0,
              }}
            >
              <Box
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: iconBg,
                  color: ink,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {iconForLabel(row.label)}
              </Box>
              <Text
                size="sm"
                fw={guadagno ? 700 : 550}
                style={{ color: ink, fontFamily: founding.fontBody }}
              >
                {row.label}
                {guadagno ? (
                  <Text span size="xs" fw={600} ml={6} style={{ color: muted }}>
                    (piattaforma)
                  </Text>
                ) : null}
              </Text>
              <Text
                size="sm"
                fw={800}
                ta="right"
                style={{
                  color: ink,
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: founding.fontDisplay,
                }}
              >
                {formatEuro(row.amount_cents, currency)}
              </Text>
            </Box>
          )
        })}
        <Box
          pt="md"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '0.75rem',
            alignItems: 'baseline',
          }}
        >
          <Text size="sm" fw={800} style={{ color: ink, fontFamily: founding.fontDisplay }}>
            Totale
          </Text>
          <Text
            size="md"
            fw={800}
            ta="right"
            style={{
              color: ink,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: founding.fontDisplay,
            }}
          >
            {formatEuro(total, currency)}
          </Text>
        </Box>
      </Stack>
    </Box>
  )
}
