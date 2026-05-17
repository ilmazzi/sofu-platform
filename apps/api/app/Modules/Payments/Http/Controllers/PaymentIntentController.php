<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Payments\Application\CreatePaymentIntentAction;
use App\Modules\Payments\Http\Requests\StorePaymentIntentRequest;
use App\Modules\Payments\Http\Resources\PaymentResource;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Http\JsonResponse;

class PaymentIntentController
{
    public function store(
        StorePaymentIntentRequest $request,
        Reservation $reservation,
        CreatePaymentIntentAction $createPaymentIntent,
    ): JsonResponse {
        $result = $createPaymentIntent->execute($reservation->load('campaign', 'supporter'));

        return PaymentResource::make($result['payment'])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }
}
