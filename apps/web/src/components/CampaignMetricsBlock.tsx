import type { ReactElement } from 'react'
import { Badge, Divider, Group, Progress, SimpleGrid, Text } from '@mantine/core'
import type { components } from '@sofu/contracts'
import {
  formatDateIt,
  formatEuro,
  priceDropProgressPercent,
  priceIfOneMoreSupporterCents,
  savingsVsPeakEuro,
  supporterProgressPercent,
} from '../lib/campaignMetrics'

type Campaign = components['schemas']['Campaign']

export function CampaignMetricsBlock({ c, compact = false }: { c: Campaign; compact?: boolean }): ReactElement {
  const bodySm = compact ? 'xs' : 'sm'
  const supPct = supporterProgressPercent(c)
  const pricePathPct = priceDropProgressPercent(c)
  const savings = savingsVsPeakEuro(c)
  const nextCents = priceIfOneMoreSupporterCents(c)
  const atFloor = c.current_price_cents <= c.min_price_cents
  const nextDrops = nextCents < c.current_price_cents
  const ends = formatDateIt(c.ends_at)
  const starts = formatDateIt(c.starts_at)

  return (
    <div>
      <Divider label="Comunità" labelPosition="left" />
      <div>
        <Group justify="space-between" gap="xs" mb={6} wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed">
            Sostenitori attivi
          </Text>
          <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {c.active_reservations_count} / {c.target_supporters}
          </Text>
        </Group>
        <Progress value={supPct} size="sm" radius="xl" color="teal" aria-label="Avanzamento obiettivo persone" />
        <Text size="xs" c="dimmed" mt={6}>
          {supPct >= 100
            ? 'Obiettivo persone raggiunto o superato.'
            : `${Math.round(supPct)}% dell’obiettivo di partecipanti.`}
        </Text>
      </div>

      <Divider label="Prezzo dinamico" labelPosition="left" mt="md" />
      <div>
        <Group justify="space-between" gap="xs" mb={6} wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed">
            Percorso verso il minimo
          </Text>
          <Text size="xs" fw={700}>
            {Math.round(pricePathPct)}%
          </Text>
        </Group>
        <Progress value={pricePathPct} size="sm" radius="xl" color="orange" aria-label="Avvicinamento al prezzo minimo" />
        <Text size="xs" c="dimmed" mt={6}>
          {atFloor
            ? 'Prezzo già al pavimento: non può scendere oltre.'
            : 'Più persone entrano, più la quota si avvicina al minimo possibile.'}
        </Text>
      </div>

      <SimpleGrid cols={compact ? 3 : { base: 1, xs: 3 }} spacing="xs" verticalSpacing="xs" mt="md">
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            Picco
          </Text>
          <Text size="sm" fw={700} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatEuro(c.max_price_cents, c.currency)}
          </Text>
          <Text size="xs" c="dimmed" lh={1.2}>
            primo posto
          </Text>
        </div>
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            Ora
          </Text>
          <Text size="sm" fw={800} lh={1.2} c="orange.8" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatEuro(c.current_price_cents, c.currency)}
          </Text>
          <Text size="xs" c="dimmed" lh={1.2}>
            quota attuale
          </Text>
        </div>
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            Minimo
          </Text>
          <Text size="sm" fw={700} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatEuro(c.min_price_cents, c.currency)}
          </Text>
          <Text size="xs" c="dimmed" lh={1.2}>
            pavimento
          </Text>
        </div>
      </SimpleGrid>

      <Group gap="xs" wrap="wrap" mt="md">
        {savings > 0.004 ? (
          <Badge variant="filled" color="green" size="lg" radius="sm" tt="none">
            Risparmi {savings.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} € vs
            picco
          </Badge>
        ) : (
          <Badge variant="light" color="gray" size="md" tt="none">
            Prezzo ancora al picco iniziale
          </Badge>
        )}
      </Group>

      <Text size={bodySm} c="dimmed" lh={compact ? 1.5 : 1.6} mt="md">
        {c.active_reservations_count === 0 ? (
          <>
            <strong>Primo ingresso:</strong> con un solo sostenitore il prezzo è ancora al picco; ogni nuovo ingresso
            tende ad abbassare la quota per tutti i successivi (fino al minimo).
          </>
        ) : nextDrops ? (
          <>
            <strong>Prossimo calo stimato:</strong> con un sostenitore in più la quota indicativa sarebbe circa{' '}
            <Text span fw={700} c="dark">
              {formatEuro(nextCents, c.currency)}
            </Text>{' '}
            (stesso obiettivo economico, più persone che lo ripartiscono).
          </>
        ) : (
          <>
            <strong>Prezzo stabile al prossimo ingresso:</strong> la quota resterebbe {formatEuro(nextCents, c.currency)}{' '}
            (già al minimo o vincolata dai limiti della campagna).
          </>
        )}
      </Text>

      {(starts || ends) && (
        <Group gap="md" wrap="wrap" mt="md">
          {starts ? (
            <Text size={bodySm} c="dimmed">
              <strong>Inizio raccolta:</strong> {starts}
            </Text>
          ) : null}
          {ends ? (
            <Text size={bodySm} c="dimmed">
              <strong>Fine prevista:</strong> {ends}
            </Text>
          ) : null}
        </Group>
      )}

      <Text size={bodySm} c="dimmed" ta="right" opacity={compact ? 0.85 : 0.9} mt="md" fw={compact ? 400 : 500}>
        Obiettivo economico totale: {formatEuro(c.total_amount_cents, c.currency)}
      </Text>
    </div>
  )
}
