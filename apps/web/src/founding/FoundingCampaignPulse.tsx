import type { CSSProperties, ReactElement } from 'react'
import { Box, Button, Group, Stack, Text } from '@mantine/core'
import {
  IconArrowDownRight,
  IconFlag,
  IconPlant2,
  IconSeedling,
  IconTrendingDown,
  IconUsers,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { formatEuro, supporterProgressPercent } from '../lib/campaignMetrics'
import { founding } from './theme'

type Campaign = components['schemas']['Campaign']

type Props = {
  campaign: Campaign
  accent?: string
  /** CTA in fondo card (landing). */
  showSupportCta?: boolean
}

export function FoundingCampaignPulse({
  campaign,
  accent = founding.mustard,
  showSupportCta = false,
}: Props): ReactElement {
  const pct = Math.min(100, Math.max(0, supporterProgressPercent(campaign)))
  const bloomed = campaign.active_reservations_count >= campaign.target_supporters
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const ringOffset = circumference * (1 - pct / 100)

  return (
    <Box
      p={{ base: 'lg', sm: 'xl' }}
      className="founding-fade-up"
      style={{
        background: `linear-gradient(145deg, ${accent} 0%, ${accent}ee 55%, ${accent}cc 100%)`,
        borderRadius: 28,
        color: founding.ink,
        boxShadow: '0 22px 48px rgba(8, 40, 52, 0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        className="founding-soft-pulse"
        aria-hidden
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          right: -40,
          top: -48,
          background: 'rgba(247,241,230,0.28)',
          pointerEvents: 'none',
        }}
      />

      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8}>
              <IconPlant2 size={18} stroke={1.75} />
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: '0.16em', opacity: 0.75, fontFamily: founding.fontBody }}
              >
                Stato campagna
              </Text>
            </Group>
            <Text
              fw={800}
              fz={{ base: '1.4rem', sm: '1.65rem' }}
              lh={1.15}
              style={{ fontFamily: founding.fontDisplay, letterSpacing: '-0.03em' }}
            >
              {campaign.title}
            </Text>
            {bloomed ? (
              <Text size="sm" fw={600} style={{ fontFamily: founding.fontBody }}>
                Bloom raggiunto — il goal è coperto. Più quote → meno paga ciascuna.
              </Text>
            ) : (
              <Text size="sm" style={{ opacity: 0.8, fontFamily: founding.fontBody }}>
                Mancano {Math.max(0, campaign.target_supporters - campaign.active_reservations_count)}{' '}
                quote al Bloom.
              </Text>
            )}
          </Stack>

          <Box className="founding-float" style={{ width: 104, height: 104, flexShrink: 0 }}>
            <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
              <circle
                cx="52"
                cy="52"
                r={radius}
                fill="none"
                stroke="rgba(26,18,8,0.14)"
                strokeWidth="8"
              />
              <circle
                className="founding-ring-progress"
                cx="52"
                cy="52"
                r={radius}
                fill="none"
                stroke={founding.ink}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                style={
                  {
                    '--ring-len': circumference,
                    '--ring-offset': ringOffset,
                    transform: 'rotate(-90deg)',
                    transformOrigin: '52px 52px',
                  } as CSSProperties
                }
              />
              <text
                x="52"
                y="56"
                textAnchor="middle"
                style={{
                  fontFamily: founding.fontDisplay,
                  fontSize: 18,
                  fontWeight: 800,
                  fill: founding.ink,
                }}
              >
                {pct.toFixed(0)}%
              </text>
            </svg>
          </Box>
        </Group>

        <Box>
          <Box
            mb={8}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontFamily: founding.fontBody,
            }}
          >
            <Group gap={6}>
              <IconUsers size={16} stroke={1.75} />
              <Text size="sm" fw={600}>
                {campaign.active_reservations_count} / {campaign.target_supporters} quote Bloom
              </Text>
            </Group>
            <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {pct.toFixed(0)}%
            </Text>
          </Box>
          <Box
            h={11}
            style={{
              borderRadius: 999,
              background: 'rgba(26,18,8,0.14)',
              overflow: 'hidden',
            }}
          >
            <Box
              className="founding-progress-fill"
              h="100%"
              style={{
                width: `${pct}%`,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${founding.ink} 0%, ${founding.tealDeep} 100%)`,
              }}
            />
          </Box>
        </Box>

        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.9rem 1rem',
          }}
        >
          <Metric
            icon={<IconPlant2 size={16} stroke={1.75} />}
            label="Quota attuale"
            value={formatEuro(campaign.current_price_cents, campaign.currency)}
          />
          <Metric
            icon={<IconFlag size={16} stroke={1.75} />}
            label="Obiettivo"
            value={formatEuro(campaign.total_amount_cents, campaign.currency)}
          />
          <Metric
            icon={<IconArrowDownRight size={16} stroke={1.75} />}
            label="Max quota"
            value={formatEuro(campaign.max_price_cents, campaign.currency)}
          />
          <Metric
            icon={<IconTrendingDown size={16} stroke={1.75} />}
            label="Può scendere fino a"
            value={formatEuro(campaign.min_price_cents, campaign.currency)}
          />
        </Box>
        <Text size="xs" style={{ opacity: 0.78, fontFamily: founding.fontBody, lineHeight: 1.45 }}>
          Più persone sostengono, meno paga ciascuna: con ~140 mila quote si arriva a circa 1 € a quota.
        </Text>

        {showSupportCta ? (
          <Stack gap="sm" mt={4}>
            <Button
              component={Link}
              to="/sostieni"
              size="lg"
              fullWidth
              color="dark"
              leftSection={<IconSeedling size={20} stroke={1.75} />}
              className="founding-cta-shimmer"
              styles={{
                root: {
                  minHeight: 56,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                  fontFamily: founding.fontBody,
                  borderRadius: 10,
                  position: 'relative',
                  overflow: 'hidden',
                },
              }}
            >
              Sostieni SoFu
            </Button>
            <Text size="sm" ta="center" style={{ opacity: 0.85, fontFamily: founding.fontBody }}>
              Hai già sostenuto?{' '}
              <Link to="/login?next=/sostieni/stato" style={{ color: founding.ink, fontWeight: 700 }}>
                Accedi al tuo impegno
              </Link>
            </Text>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactElement
}): ReactElement {
  return (
    <Box>
      <Group gap={6} mb={2}>
        <Box style={{ opacity: 0.7, display: 'flex' }}>{icon}</Box>
        <Text size="xs" style={{ opacity: 0.7, letterSpacing: '0.04em' }}>
          {label}
        </Text>
      </Group>
      <Text fw={800} style={{ fontFamily: founding.fontDisplay, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </Box>
  )
}
