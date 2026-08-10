<?php

namespace App\Modules\Payments\Domain\Contracts;

use App\Models\User;
use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Payments\Domain\SetupIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;

interface PaymentProvider
{
    public function createIntent(Reservation $reservation): PaymentIntentData;

    public function createSetupIntent(User $user): SetupIntentData;

    /**
     * @return array{setup_intent_id: string, payment_method_id: string, status: string}
     */
    public function retrieveSucceededSetupIntent(string $setupIntentId): array;
}
