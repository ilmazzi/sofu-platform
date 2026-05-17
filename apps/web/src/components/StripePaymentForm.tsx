import { type FormEvent, type ReactElement, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Alert, Button, Stack } from '@mantine/core'
import type { components } from '@sofu/contracts'
import { getStripePublishableKey } from '../lib/stripePublishableKey'

type Payment = components['schemas']['Payment']

function InnerCheckout({
  returnUrl,
  onCompleted,
}: {
  returnUrl: string
  onCompleted?: () => void
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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    })

    setBusy(false)

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message ?? 'Pagamento non riuscito.')
      } else {
        setMessage(error.message ?? 'Errore imprevisto.')
      }
      return
    }

    onCompleted?.()
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <Stack gap="md">
        <PaymentElement />
        <Button type="submit" disabled={!stripe || busy} loading={busy} color="teal" radius="md">
          Paga ora
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

export function StripePaymentForm({
  payment,
  returnNextPath,
  onCompleted,
}: {
  payment: Payment
  /** Path dopo redirect 3DS (es. Le mie drop: /me/reservations) */
  returnNextPath: string
  onCompleted?: () => void
}): ReactElement | null {
  /** In anteprima/sviluppo il provider mock non espone carta: niente riferimenti tecnici in UI. */
  if (payment.provider === 'mock') {
    return null
  }

  const pk = getStripePublishableKey()
  const stripePromise = useMemo(() => (pk ? loadStripe(pk) : null), [pk])

  if (!pk) {
    return (
      <Alert color="orange" variant="light">
        Il pagamento con carta non è ancora disponibile su questo ambiente. Riprova più tardi o contatta il supporto.
      </Alert>
    )
  }

  if (!payment.provider_client_secret) {
    return (
      <Alert color="red" variant="light">
        Non è stato possibile avviare il pagamento. Riprova tra qualche istante.
      </Alert>
    )
  }

  if (!stripePromise) {
    return (
      <Alert color="red" variant="light">
        Non è stato possibile caricare il modulo di pagamento. Ricarica la pagina e riprova.
      </Alert>
    )
  }

  const returnUrl = `${window.location.origin}/payments/complete?next=${encodeURIComponent(returnNextPath)}`

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: payment.provider_client_secret,
        locale: 'it',
      }}
      key={`${payment.id}:${payment.provider_client_secret}`}
    >
      <InnerCheckout returnUrl={returnUrl} onCompleted={onCompleted} />
    </Elements>
  )
}
