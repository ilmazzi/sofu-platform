<?php

namespace App\Modules\Payments\Infrastructure\Providers;

use App\Models\User;
use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Payments\Domain\SetupIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use RuntimeException;
use Stripe\StripeClient;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class StripePaymentProvider implements PaymentProvider
{
    public function createIntent(Reservation $reservation): PaymentIntentData
    {
        $secret = config('payments.stripe.secret');
        if (! is_string($secret) || $secret === '') {
            throw new RuntimeException('Stripe is not configured (missing STRIPE_SECRET).');
        }

        $reservation->loadMissing('campaign');
        $currency = strtolower($reservation->campaign->currency);
        $amountCents = $reservation->paymentAmountCents();

        $stripe = new StripeClient($secret);
        $intent = $stripe->paymentIntents->create([
            'amount' => $amountCents,
            'currency' => $currency,
            'metadata' => [
                'reservation_id' => (string) $reservation->id,
            ],
            'automatic_payment_methods' => ['enabled' => true],
        ], [
            // Prevent duplicate intents on retries / double-clicks.
            'idempotency_key' => 'sofu_pi_reservation_'.(string) $reservation->id.'_'.Str::lower((string) $amountCents),
        ]);

        $clientSecret = $intent->client_secret;
        if (! is_string($clientSecret) || $clientSecret === '') {
            throw new RuntimeException('Stripe PaymentIntent returned no client_secret.');
        }

        return new PaymentIntentData(
            provider: 'stripe',
            providerPaymentId: $intent->id,
            clientSecret: $clientSecret,
            amountCents: (int) $intent->amount,
            currency: strtoupper((string) $intent->currency),
        );
    }

    public function createSetupIntent(User $user): SetupIntentData
    {
        $secret = config('payments.stripe.secret');
        if (! is_string($secret) || $secret === '') {
            throw new RuntimeException('Stripe is not configured (missing STRIPE_SECRET).');
        }

        $stripe = new StripeClient($secret);
        $customerId = $this->ensureCustomer($stripe, $user);

        $intent = $stripe->setupIntents->create([
            'customer' => $customerId,
            'usage' => 'off_session',
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ], [
            'idempotency_key' => 'sofu_seti_user_'.(string) $user->id.'_'.now()->format('YmdHi'),
        ]);

        $clientSecret = $intent->client_secret;
        if (! is_string($clientSecret) || $clientSecret === '') {
            throw new RuntimeException('Stripe SetupIntent returned no client_secret.');
        }

        return new SetupIntentData(
            provider: 'stripe',
            setupIntentId: $intent->id,
            clientSecret: $clientSecret,
        );
    }

    public function retrieveSucceededSetupIntent(string $setupIntentId): array
    {
        $secret = config('payments.stripe.secret');
        if (! is_string($secret) || $secret === '') {
            throw new RuntimeException('Stripe is not configured (missing STRIPE_SECRET).');
        }

        $stripe = new StripeClient($secret);
        $intent = $stripe->setupIntents->retrieve($setupIntentId);

        if (($intent->status ?? null) !== 'succeeded') {
            throw new UnprocessableEntityHttpException('Payment method setup is not complete.');
        }

        $paymentMethodId = $intent->payment_method ?? null;
        if (! is_string($paymentMethodId) || $paymentMethodId === '') {
            throw new UnprocessableEntityHttpException('SetupIntent has no payment method.');
        }

        return [
            'setup_intent_id' => $intent->id,
            'payment_method_id' => $paymentMethodId,
            'status' => (string) $intent->status,
        ];
    }

    private function ensureCustomer(StripeClient $stripe, User $user): string
    {
        if (is_string($user->stripe_customer_id) && $user->stripe_customer_id !== '') {
            return $user->stripe_customer_id;
        }

        $customer = $stripe->customers->create([
            'email' => $user->email,
            'name' => $user->name,
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ]);

        User::query()->whereKey($user->id)->update([
            'stripe_customer_id' => $customer->id,
        ]);
        $user->stripe_customer_id = $customer->id;

        return $customer->id;
    }
}
