import type { ReactElement } from 'react'
import { Box, Group, Image, Stack, Text } from '@mantine/core'
import { CAMPAIGN_GROWTH_STAGES, growthStageFromSupporterPercent } from '../lib/campaignGrowthStages'

const FIORITURA_TITLE = 'La comunità aumenta e diminuisce la spesa!'
const FIORITURA_CAPTION =
  'Il tuo seme è cresciuto fino alla fioritura! Hai trovato tutte le persone che ti servivano per realizzarlo, d’ora in avanti, chiunque ti sostenga, permetterà alle altre persone di sostenere una spesa minore!'

type Variant = 'compact' | 'featured' | 'creatorSeed'

export function CampaignGrowthPlant({
  progressPercent,
  variant = 'compact',
  projectLabel = 'progetto',
  inFioritura = false,
}: {
  /** Percentuale avanzamento obiettivo persone (0–100). */
  progressPercent: number
  variant?: Variant
  /** Sostituto per "progetto" nel testo accessibile. */
  projectLabel?: string
  /** Campagna in fase blooming (post-Bloom): copy e immagine di fioritura. */
  inFioritura?: boolean
}): ReactElement {
  const stage = inFioritura
    ? CAMPAIGN_GROWTH_STAGES[4]!
    : growthStageFromSupporterPercent(progressPercent)
  const rounded = Math.round(Math.min(100, Math.max(0, progressPercent)))

  const imgH = variant === 'compact' ? 92 : variant === 'creatorSeed' ? 200 : 220
  const imgMaxW = variant === 'compact' ? 140 : variant === 'creatorSeed' ? 280 : 320

  /** Sfondo chiaro fisso: con `mix-blend-mode: multiply` sul PNG il bianco “scompare” senza editare i file. */
  const panelBg =
    variant === 'compact'
      ? 'linear-gradient(135deg, #e6f7f3 0%, #e8f5e9 100%)'
      : 'linear-gradient(160deg, #e6f7f3 0%, #f0faf4 52%, #e8f5e9 100%)'

  if (variant === 'creatorSeed') {
    return (
      <Box
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          background: panelBg,
          border: '1px solid rgba(0, 92, 77, 0.12)',
        }}
        p="lg"
      >
        <Group align="center" wrap="nowrap" gap="xl" justify="center" style={{ flexDirection: 'column' }}>
          <Image
            src={stage.img}
            alt={`Fase ${stage.label} della tua idea (${rounded}% verso l’obiettivo)`}
            h={imgH}
            w="auto"
            maw={imgMaxW}
            fit="contain"
            style={{
              flexShrink: 0,
              mixBlendMode: 'multiply',
            }}
          />
          <Stack gap="xs" style={{ minWidth: 0, textAlign: 'center' }}>
            <Text size="xs" fw={700} c="teal.8" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              {stage.label}
            </Text>
            <Text size="xl" fw={800} lh={1.25} style={{ letterSpacing: '-0.02em' }}>
              Stai piantando un seme
            </Text>
            <Text size="sm" c="dimmed" lh={1.6} maw={520} mx="auto">
              La comunità annaffierà la tua idea durante tutta la durata della campagna.
            </Text>
          </Stack>
        </Group>
      </Box>
    )
  }

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
            {inFioritura ? FIORITURA_TITLE : `La comunità fa crescere il ${projectLabel}`}
          </Text>
          <Text size="xs" c="dimmed" lh={1.55}>
            {inFioritura
              ? FIORITURA_CAPTION
              : `${rounded}% dell’obiettivo persone: più sostenitori entrano, più la piantina avanza verso la fioritura.`}
          </Text>
        </Stack>
      </Group>
    </Box>
  )
}
