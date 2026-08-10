import { type FormEvent, type ReactElement, useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Alert, Button, Loader, Stack, Text } from '@mantine/core'
import { getStripePublishableKey } from '../lib/stripePublishableKey'

function InnerSetup({
  onCompleted,
  submitLabel = 'Conferma carta',
}: {
  onCompleted: (setupIntentId: string) => void | Promise<void>
  submitLabel?: string
}): ReactElement {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [elementReady, setElementReady] = useState(false)
  const [elementError, setElementError] = useState<string | null>(null)

  useEffect(() => {
    if (stripe) return
    const t = window.setTimeout(() => {
      setElementError(
        'Stripe non si è caricato. Controlla VITE_STRIPE_PUBLISHABLE_KEY sul servizio web (build) e che sia allineata a STRIPE_SECRET (entrambe test o entrambe live).',
      )
    }, 12_000)
    return () => window.clearTimeout(t)
  }, [stripe])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setMessage(null)

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/sostieni`,
        },
      })

      if (error) {
        setMessage(error.message ?? 'Verifica della carta non riuscita.')
        return
      }

      if (!setupIntent?.id || setupIntent.status !== 'succeeded') {
        setMessage('La verifica della carta non è ancora completa. Riprova.')
        return
      }

      await onCompleted(setupIntent.id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore durante la verifica carta.')
    } finally {
      setBusy(false)
    }
  }

  if (elementError && !stripe) {
    return (
      <Alert color="red" variant="light">
        {elementError}
      </Alert>
    )
  }

  if (!stripe || !elements) {
    return (
      <Stack gap="sm" align="center" py="md">
        <Loader color="dark" size="sm" />
        <Text size="sm" c="dimmed">
          Caricamento modulo carta…
        </Text>
      </Stack>
    )
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <Stack gap="md">
        {!elementReady ? (
          <Stack gap="xs" align="center" py="sm">
            <Loader color="dark" size="sm" />
            <Text size="sm" c="dimmed">
              Preparazione campi carta…
            </Text>
          </Stack>
        ) : null}
        <PaymentElement
          onReady={() => setElementReady(true)}
          onLoadError={(e) => {
            setElementError(e.error.message ?? 'Impossibile caricare i campi carta Stripe.')
          }}
        />
        {elementError ? (
          <Alert color="red" variant="light">
            {elementError}
          </Alert>
        ) : null}
        <Button
          type="submit"
          disabled={!elementReady || busy}
          loading={busy}
          color="dark"
          radius="md"
          fullWidth
        >
          {submitLabel}
        </Button>
        {message ? (
          <Alert color="red" variant="light">
            {message}
          </Alert>
        ) : null}
      </Stack>
    </form>
  )
}

export function StripeSetupForm({
  provider,
  clientSecret,
  setupIntentId,
  onCompleted,
  submitLabel,
}: {
  provider: string
  clientSecret: string
  setupIntentId: string
  onCompleted: (setupIntentId: string) => void | Promise<void>
  submitLabel?: string
}): ReactElement {
  const pk = getStripePublishableKey()
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (provider === 'mock') return
    if (!pk) {
      setLoadError('VITE_STRIPE_PUBLISHABLE_KEY non configurata sul frontend (serve rebuild del web).')
      return
    }
    let cancelled = false
    void loadStripe(pk).then((s) => {
      if (cancelled) return
      if (!s) {
        setLoadError('loadStripe ha restituito null: chiave publishable non valida.')
        return
      }
      setStripe(s)
    })
    return () => {
      cancelled = true
    }
  }, [provider, pk])

  if (provider === 'mock') {
    return (
      <Stack gap="sm">
        <Alert color="teal" variant="light">
          Ambiente di sviluppo: la carta non è richiesta. Conferma per salvare la promessa.
        </Alert>
        <Button color="dark" radius="md" fullWidth onClick={() => void onCompleted(setupIntentId)}>
          {submitLabel ?? 'Conferma promessa (mock)'}
        </Button>
      </Stack>
    )
  }

  if (loadError) {
    return (
      <Alert color="orange" variant="light">
        {loadError}
      </Alert>
    )
  }

  if (!stripe) {
    return (
      <Stack gap="sm" align="center" py="md">
        <Loader color="dark" size="sm" />
        <Text size="sm" c="dimmed">
          Connessione a Stripe…
        </Text>
      </Stack>
    )
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret, locale: 'it' }} key={clientSecret}>
      <InnerSetup onCompleted={onCompleted} submitLabel={submitLabel} />
    </Elements>
  )
}
