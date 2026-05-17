import { type ReactElement, useState } from 'react'
import { Alert, Button, Stack, Text } from '@mantine/core'
import type { components } from '@sofu/contracts'
import { apiFetch } from '../lib/api/client'
import { formatEuro } from '../lib/campaignMetrics'

type Payment = components['schemas']['Payment']

/**
 * In sviluppo l’API usa PAYMENT_PROVIDER=mock: niente carta Stripe.
 * Il PaymentIntent resta in requires_confirmation finché non arriva il webhook mock.
 */
export function MockPaymentDevPanel({
  payment,
  onCompleted,
}: {
  payment: Payment
  onCompleted?: () => void
}): ReactElement {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function simulateCapture(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch('/api/v1/payments/webhooks/mock', {
        method: 'POST',
        json: {
          event_id: `mock_ui_${payment.id}_${Date.now()}`,
          type: 'payment.captured',
          provider_payment_id: payment.provider_payment_id,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: string }).message)
            : `Simulazione non riuscita (${res.status}).`
        setError(msg)
        return
      }
      setDone(true)
      onCompleted?.()
    } catch {
      setError('Errore di rete.')
    } finally {
      setBusy(false)
    }
  }

  if (done || payment.status === 'captured') {
    return (
      <Alert color="teal" variant="light" p="sm">
        <Text size="xs">
          Pagamento di prova completato per{' '}
          <Text span fw={700}>
            {formatEuro(payment.amount_cents, payment.currency)}
          </Text>
          .
        </Text>
      </Alert>
    )
  }

  return (
    <Stack gap="sm">
      <Alert color="yellow" variant="light" p="sm">
        <Text size="xs" lh={1.55}>
          <Text span fw={700}>
            Ambiente di sviluppo
          </Text>
          : qui non compare la carta perché il server usa il provider <em>mock</em>. Per Stripe reale
          imposta <Text span ff="monospace">PAYMENT_PROVIDER=stripe</Text> nell’API e la chiave pubblica nel
          frontend. Il pulsante qui sotto simula solo l’esito «pagato» in locale.
        </Text>
      </Alert>
      <Text size="xs" c="dimmed">
        Importo:{' '}
        <Text span fw={700}>
          {formatEuro(payment.amount_cents, payment.currency)}
        </Text>
        {' '}
        · stato attuale: in attesa di conferma
      </Text>
      <Button type="button" size="sm" color="teal" loading={busy} onClick={() => void simulateCapture()}>
        Simula pagamento riuscito (solo sviluppo)
      </Button>
      {error ? (
        <Text size="xs" c="red">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
