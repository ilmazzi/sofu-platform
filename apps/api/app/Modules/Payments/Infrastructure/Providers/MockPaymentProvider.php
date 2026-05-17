<?php

namespace App\Modules\Payments\Infrastructure\Providers;

use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Support\Str;

class MockPaymentProvider implements PaymentProvider
{
    public function createIntent(Reservation $reservation): PaymentIntentData
    {
        $providerPaymentId = 'mock_pi_'.Str::lower((string) Str::ulid());

        return new PaymentIntentData(
            provider: 'mock',
            providerPaymentId: $providerPaymentId,
            clientSecret: 'mock_secret_'.$providerPaymentId,
            amountCents: $reservation->paymentAmountCents(),
            currency: $reservation->campaign->currency,
        );
    }
}
