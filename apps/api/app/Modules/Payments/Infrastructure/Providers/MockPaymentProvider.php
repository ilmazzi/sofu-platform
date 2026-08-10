<?php

namespace App\Modules\Payments\Infrastructure\Providers;

use App\Models\User;
use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Payments\Domain\SetupIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

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

    public function createSetupIntent(User $user): SetupIntentData
    {
        if (! is_string($user->stripe_customer_id) || $user->stripe_customer_id === '') {
            $customerId = 'cus_mock_'.Str::lower((string) Str::ulid());
            User::query()->whereKey($user->id)->update([
                'stripe_customer_id' => $customerId,
            ]);
            $user->stripe_customer_id = $customerId;
        }

        $setupIntentId = 'seti_mock_'.Str::lower((string) Str::ulid());

        return new SetupIntentData(
            provider: 'mock',
            setupIntentId: $setupIntentId,
            clientSecret: 'seti_mock_secret_'.$setupIntentId,
        );
    }

    public function retrieveSucceededSetupIntent(string $setupIntentId): array
    {
        if (! str_starts_with($setupIntentId, 'seti_mock_')) {
            throw new UnprocessableEntityHttpException('Unknown mock SetupIntent.');
        }

        return [
            'setup_intent_id' => $setupIntentId,
            'payment_method_id' => 'pm_mock_'.Str::lower(substr(hash('sha256', $setupIntentId), 0, 16)),
            'status' => 'succeeded',
        ];
    }
}
