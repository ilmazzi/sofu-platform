<?php

namespace App\Modules\Payments\Infrastructure\Providers;

use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use RuntimeException;
use Stripe\StripeClient;

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

        $stripe = new StripeClient($secret);
        $intent = $stripe->paymentIntents->create([
            'amount' => $reservation->paymentAmountCents(),
            'currency' => $currency,
            'metadata' => [
                'reservation_id' => (string) $reservation->id,
            ],
            'automatic_payment_methods' => ['enabled' => true],
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
}
