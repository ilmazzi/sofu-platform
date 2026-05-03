import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Anchor, Button, Center, Loader, Stack, Text, Title } from '@mantine/core'
import { loadStripe, type PaymentIntent } from '@stripe/stripe-js'
import { paymentSuccessHref } from '../lib/paymentSuccessHref'
import { getStripePublishableKey } from '../lib/stripePublishableKey'

export default function PaymentCompletePage(): ReactElement {
  const [searchParams] = useSearchParams()
  const clientSecret = searchParams.get('payment_intent_client_secret')
  const next = searchParams.get('next') ?? '/me/reservations'

  const pk = getStripePublishableKey()
  const configError = useMemo(() => {
    if (!clientSecret) return 'Parametri di pagamento mancanti.'
    if (!pk) return 'VITE_STRIPE_PUBLISHABLE_KEY non configurata.'
    return null
  }, [clientSecret, pk])

  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (configError || !clientSecret || !pk) return

    let cancelled = false
    void (async () => {
      try {
        const stripe = await loadStripe(pk)
        if (!stripe || cancelled) return
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret)
        if (cancelled) return
        if (error) {
          setFetchError(error.message ?? 'Errore Stripe.')
          return
        }
        setIntent(paymentIntent)
      } catch {
        if (!cancelled) setFetchError('Errore di rete.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientSecret, pk, configError])

  const loadError = configError ?? fetchError

  if (!clientSecret) {
    return (
      <Stack gap="lg" py={{ base: 'lg', sm: 'xl' }} maw={480}>
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          Pagamento
        </Title>
        <Text c="dimmed">Nessun pagamento da verificare.</Text>
        <Button component={Link} to="/me/reservations" variant="light" w="fit-content">
          I miei droplets
        </Button>
      </Stack>
    )
  }

  if (loadError) {
    return (
      <Stack gap="lg" py={{ base: 'lg', sm: 'xl' }} maw={520}>
        <Title order={2} style={{ letterSpacing: '-0.03em' }}>
          Pagamento
        </Title>
        <Alert color="red" variant="light">
          {loadError}
        </Alert>
        <Anchor component={Link} to={next} fw={600}>
          ← Torna indietro
        </Anchor>
      </Stack>
    )
  }

  if (!intent) {
    return (
      <Stack gap="xl" py={{ base: 'xl', sm: '4rem' }} align="center">
        <Title order={2} ta="center" style={{ letterSpacing: '-0.03em' }}>
          Pagamento
        </Title>
        <Center>
          <Stack align="center" gap="md">
            <Loader size="lg" color="teal" />
            <Text c="dimmed">Verifica in corso…</Text>
          </Stack>
        </Center>
      </Stack>
    )
  }

  const ok = intent.status === 'succeeded'
  const processing = intent.status === 'processing'

  return (
    <Stack gap="lg" py={{ base: 'lg', sm: 'xl' }} maw={520}>
      <Title order={2} style={{ letterSpacing: '-0.03em' }}>
        Pagamento
      </Title>
      {ok ? (
        <Alert color="teal" title="Operazione riuscita" variant="light">
          Il pagamento è stato registrato correttamente.
        </Alert>
      ) : processing ? (
        <Alert color="blue" variant="light">
          Pagamento in elaborazione… Ricontrolla tra qualche minuto.
        </Alert>
      ) : (
        <Alert color="red" variant="light">
          Stato: {intent.status}
        </Alert>
      )}
      <Button component={Link} to={ok ? paymentSuccessHref(next) : next} color="teal" w="fit-content">
        Continua
      </Button>
    </Stack>
  )
}
