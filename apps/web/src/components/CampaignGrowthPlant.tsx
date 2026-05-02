import type { ReactElement } from 'react'
import { Box, Group, Image, Stack, Text } from '@mantine/core'
import { growthStageFromSupporterPercent } from '../lib/campaignGrowthStages'

type Variant = 'compact' | 'featured'

export function CampaignGrowthPlant({
  progressPercent,
  variant = 'compact',
  projectLabel = 'progetto',
}: {
  /** Percentuale avanzamento obiettivo persone (0–100). */
  progressPercent: number
  variant?: Variant
  /** Sostituto per "progetto" nel testo accessibile. */
  projectLabel?: string
}): ReactElement {
  const stage = growthStageFromSupporterPercent(progressPercent)
  const rounded = Math.round(Math.min(100, Math.max(0, progressPercent)))

  const imgH = variant === 'compact' ? 92 : 220
  const imgMaxW = variant === 'compact' ? 140 : 320

  /** Sfondo chiaro fisso: con `mix-blend-mode: multiply` sul PNG il bianco “scompare” senza editare i file. */
  const panelBg =
    variant === 'compact'
      ? 'linear-gradient(135deg, #e6f7f3 0%, #e8f5e9 100%)'
      : 'linear-gradient(160deg, #e6f7f3 0%, #f0faf4 52%, #e8f5e9 100%)'

  return (
    <Box
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        background: panelBg,
        border: '1px solid rgba(0, 92, 77, 0.12)',
      }}
      p={variant === 'compact' ? 'sm' : 'lg'}
    >
      <Group
        align="center"
        wrap="nowrap"
        gap={variant === 'compact' ? 'md' : 'xl'}
        justify={variant === 'featured' ? 'center' : 'flex-start'}
        style={{ flexDirection: variant === 'featured' ? 'column' : 'row' }}
      >
        <Image
          src={stage.img}
          alt={`Stadio della piantina del ${projectLabel}: ${stage.label} (${rounded}% verso l’obiettivo persone)`}
          h={imgH}
          w="auto"
          maw={imgMaxW}
          fit="contain"
          style={{
            flexShrink: 0,
            mixBlendMode: 'multiply',
          }}
        />
        <Stack gap={variant === 'compact' ? 2 : 'xs'} style={{ flex: variant === 'compact' ? 1 : undefined, minWidth: 0 }}>
          <Text size={variant === 'compact' ? 'xs' : 'sm'} fw={700} c="teal.8" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            {stage.label}
          </Text>
          <Text size={variant === 'compact' ? 'sm' : 'lg'} fw={700} lh={1.3} style={{ letterSpacing: '-0.02em' }}>
            La comunità fa crescere il {projectLabel}
          </Text>
          <Text size="xs" c="dimmed" lh={1.55}>
            {rounded}% dell’obiettivo persone: più sostenitori entrano, più la piantina avanza verso la fioritura.
          </Text>
        </Stack>
      </Group>
    </Box>
  )
}
