import type { ReactElement } from 'react'
import { Alert, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import type { components } from '@sofu/contracts'
import { campaignHasReachedBloom } from '../lib/bloom'
import {
  DROP_DROPLETS_AND_CREATOR,
  DROP_NO_IMMEDIATE_CHARGE,
  DROP_QUOTE_VS_VALUE_HINT,
  DROP_STABLE_UNTIL_BLOOM,
  LABEL_BLOOMING_DROP_CURRENT,
  LABEL_BLOOMING_DROP_LIMIT,
  LABEL_GROWING_DROP,
  dropMaxDecreaseCaption,
} from '../lib/dropMechanics'
import { formatEuro } from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']

export function CampaignMetricsBlock({
  c,
  compact = false,
  creatorPreview = false,
}: {
  c: Campaign
  compact?: boolean
  /** Anteprima lato creatore: numeri più leggibili, senza sezione “Partecipa” / prezzo dinamico. */
  creatorPreview?: boolean
}): ReactElement {
  const bodySm = compact ? 'xs' : 'sm'
  const fullBloom = c.full_bloom_drops ?? null
  const bloomed = campaignHasReachedBloom(c)
  const progressDenominator =
    bloomed && fullBloom !== null && fullBloom > 0 ? fullBloom : c.target_supporters

  if (creatorPreview) {
    return (
      <div>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" verticalSpacing="md">
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
              Growing drops
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Quote in crescita dal seme fino al Bloom: quante servono perché la campagna “sbocci” (posti, non euro).
            </Text>
            <Text size={compact ? 'lg' : 'xl'} fw={800} lh={1.2} mt={4}>
              {c.target_supporters}
            </Text>
          </div>
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
              Blooming drops (tetto)
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Dopo il Bloom, le adesioni diventano blooming: tetto di posti per la fioritura completa.
            </Text>
            <Text size={compact ? 'lg' : 'xl'} fw={800} lh={1.2} mt={4}>
              {fullBloom ?? '—'}
            </Text>
          </div>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" verticalSpacing="md" mt="md">
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
              {LABEL_GROWING_DROP}
            </Text>
            <Text size={compact ? 'md' : 'lg'} fw={700} lh={1.2} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatEuro(c.max_price_cents, c.currency)}
            </Text>
          </div>
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
              {LABEL_BLOOMING_DROP_LIMIT}
            </Text>
            <Text size={compact ? 'md' : 'lg'} fw={700} lh={1.2} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatEuro(c.min_price_cents, c.currency)}
            </Text>
          </div>
        </SimpleGrid>

        <Divider my="md" />
        <Text size={bodySm} fw={700} ta="center" lh={1.5}>
          Obiettivo economico totale: {formatEuro(c.total_amount_cents, c.currency)}
        </Text>
      </div>
    )
  }

  return (
    <div>
      <Divider label="Comunità 💧" labelPosition="left" />
      <div>
        <Group justify="space-between" gap="xs" mb={6} wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed">
            {bloomed ? 'Blooming drops' : 'Growing drops'}
          </Text>
          <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {c.active_reservations_count} / {progressDenominator}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mt={6}>
          {bloomed
            ? `Dopo il Bloom le adesioni sono “in fiore”: avanzamento verso il tetto (${progressDenominator} posti). `
            : 'Fase di crescita: adesioni raccolte fino al Bloom (posti, non importo in euro). '}
          {DROP_QUOTE_VS_VALUE_HINT}
        </Text>
      </div>

      <Divider label="Quota" labelPosition="left" mt="md" />
      <SimpleGrid cols={{ base: 1, sm: bloomed ? 3 : 2 }} spacing="xs" verticalSpacing="xs" mt="md">
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            {LABEL_GROWING_DROP}
          </Text>
          <Text size="sm" fw={700} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatEuro(c.max_price_cents, c.currency)}
          </Text>
          <Text size="xs" c="dimmed" lh={1.2}>
            {bloomed
              ? 'offerta di partenza (fase growing)'
              : 'offerta di partenza — fino al Bloom non scende'}
          </Text>
        </div>
        {bloomed ? (
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
              {LABEL_BLOOMING_DROP_CURRENT}
            </Text>
            <Text size="sm" fw={800} lh={1.2} c="orange.8" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatEuro(c.current_price_cents, c.currency)}
            </Text>
            <Text size="xs" c="dimmed" lh={1.45}>
              Può scendere verso il limite man mano che entrano blooming drops (dettaglio sotto).
            </Text>
          </div>
        ) : null}
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            {LABEL_BLOOMING_DROP_LIMIT}
          </Text>
          <Text size="sm" fw={700} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatEuro(c.min_price_cents, c.currency)}
          </Text>
          <Text size="xs" c="dimmed" lh={1.45}>
            Tetto basso se tutte le blooming drops (tetto fioritura) si riempiono
          </Text>
        </div>
      </SimpleGrid>

      <Alert variant="light" color="gray" title="Cose da sapere sulla Drop" mt="md">
        <Stack gap="xs">
          <Text size="xs" lh={1.55}>
            <Text span fw={700}>
              1.{' '}
            </Text>
            {DROP_NO_IMMEDIATE_CHARGE}
          </Text>
          <Text size="xs" lh={1.55}>
            <Text span fw={700}>
              2.{' '}
            </Text>
            {DROP_STABLE_UNTIL_BLOOM}
          </Text>
          <Text size="xs" lh={1.55}>
            <Text span fw={700}>
              3.{' '}
            </Text>
            {dropMaxDecreaseCaption(c)}
          </Text>
          <Text size="xs" lh={1.55}>
            <Text span fw={700}>
              4.{' '}
            </Text>
            {DROP_DROPLETS_AND_CREATOR}
          </Text>
        </Stack>
      </Alert>

      <Text size={bodySm} c="dimmed" ta="right" opacity={compact ? 0.85 : 0.9} mt="md" fw={compact ? 400 : 500}>
        Obiettivo economico totale: {formatEuro(c.total_amount_cents, c.currency)}
      </Text>
    </div>
  )
}
