<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Payments\Application\CreatePaymentIntentAction;
use App\Modules\Payments\Http\Requests\StorePaymentIntentRequest;
use App\Modules\Payments\Http\Resources\PaymentResource;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;

class PaymentIntentController
{
    public function store(
        StorePaymentIntentRequest $request,
        Reservation $reservation,
        CreatePaymentIntentAction $createPaymentIntent,
    ): PaymentResource {
        $payment = $createPaymentIntent->execute($reservation->load('campaign', 'supporter'));

        return PaymentResource::make($payment);
    }
}
