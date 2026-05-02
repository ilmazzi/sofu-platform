/** Stripe publishable key (safe for browser). Test: pk_test_… */
export function getStripePublishableKey(): string | undefined {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  return typeof k === 'string' && k.length > 0 ? k : undefined
}
