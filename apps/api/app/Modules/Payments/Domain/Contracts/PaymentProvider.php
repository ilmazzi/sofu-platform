<?php

namespace App\Modules\Payments\Domain\Contracts;

use App\Modules\Payments\Domain\PaymentIntentData;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;

interface PaymentProvider
{
    public function createIntent(Reservation $reservation): PaymentIntentData;
}
