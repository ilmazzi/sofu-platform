<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Notifications\Infrastructure\Notifications\ReservationCancelledNotification;
use App\Modules\Reservations\Application\CancelReservationAction;
use App\Modules\Reservations\Application\CreateReservationAction;
use App\Modules\Reservations\Http\Requests\StoreReservationRequest;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Auth\Access\AuthorizationException;
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

    public function destroy(
        Request $request,
        Reservation $reservation,
        CancelReservationAction $cancelReservation,
    ): JsonResponse {
        
        if ($request->user() === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        
        if ($request->user()->id !== $reservation->supporter_id) {
            throw new AuthorizationException('You cannot cancel this reservation.');
        }

        $cancelled = $cancelReservation->execute($reservation, $request->user());

        $cancelled->loadMissing('supporter', 'campaign');
        $cancelled->supporter?->notify(new ReservationCancelledNotification($cancelled));

        return ReservationResource::make($cancelled)->response()->setStatusCode(200);
    }
}
