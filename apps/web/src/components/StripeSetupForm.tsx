import { type FormEvent, type ReactElement, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Alert, Button, Stack } from '@mantine/core'
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

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setMessage(null)

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/sostieni`,
      },
    })

    setBusy(false)

    if (error) {
      setMessage(error.message ?? 'Verifica della carta non riuscita.')
      return
    }

    if (!setupIntent?.id || setupIntent.status !== 'succeeded') {
      setMessage('La verifica della carta non è ancora completa. Riprova.')
      return
    }

    await onCompleted(setupIntent.id)
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <Stack gap="md">
        <PaymentElement />
        <Button type="submit" disabled={!stripe || busy} loading={busy} color="dark" radius="md" fullWidth>
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
}): ReactElement | null {
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

  const pk = getStripePublishableKey()
  const stripePromise = useMemo(() => (pk ? loadStripe(pk) : null), [pk])

  if (!pk) {
    return (
      <Alert color="orange" variant="light">
        La verifica carta non è disponibile su questo ambiente.
      </Alert>
    )
  }

  if (!stripePromise) {
    return (
      <Alert color="red" variant="light">
        Non è stato possibile caricare Stripe. Ricarica la pagina.
      </Alert>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'it' }} key={clientSecret}>
      <InnerSetup onCompleted={onCompleted} submitLabel={submitLabel} />
    </Elements>
  )
}
