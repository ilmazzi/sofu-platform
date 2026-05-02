<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Application\CreateReservationAction;
use App\Modules\Reservations\Http\Requests\StoreReservationRequest;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReservationController
{
    public function store(
        StoreReservationRequest $request,
        Campaign $campaign,
        CreateReservationAction $createReservation,
    ): JsonResponse {
        $result = $createReservation->execute($campaign, $request->user(), $request->idempotencyKey());

        return ReservationResource::make($result['reservation'])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $reservations = Reservation::query()
            ->with(['campaign', 'priceSnapshot'])
            ->where('supporter_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return ReservationResource::collection($reservations);
    }
}
