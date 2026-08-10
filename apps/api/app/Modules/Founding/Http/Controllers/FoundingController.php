<?php

namespace App\Modules\Founding\Http\Controllers;

use App\Modules\Campaigns\Http\Resources\CampaignResource;
use App\Modules\Founding\Application\BootstrapFoundingUserAction;
use App\Modules\Founding\Application\CreateFoundingPledgeAction;
use App\Modules\Founding\Application\ResolveFoundingCampaignAction;
use App\Modules\Founding\Http\Requests\BootstrapFoundingRequest;
use App\Modules\Founding\Http\Requests\StoreFoundingPledgeRequest;
use App\Modules\Identity\Http\Resources\UserResource;
use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Http\Resources\ReservationResource;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoundingController
{
    public function campaign(ResolveFoundingCampaignAction $resolve): CampaignResource
    {
        $campaign = $resolve->execute()->load(['costItems', 'media']);

        return CampaignResource::make($campaign);
    }

    public function bootstrap(
        BootstrapFoundingRequest $request,
        BootstrapFoundingUserAction $bootstrap,
    ): JsonResponse {
        if ($request->user() !== null) {
            return response()->json([
                'data' => UserResource::make($request->user())->resolve(),
                'meta' => ['created' => false, 'already_authenticated' => true],
            ]);
        }

        $result = $bootstrap->execute(
            $request->fullName(),
            (string) $request->validated('email'),
        );

        return response()->json([
            'data' => UserResource::make($result['user'])->resolve(),
            'meta' => ['created' => $result['created'], 'already_authenticated' => false],
        ], 201);
    }

    public function setupIntent(Request $request, PaymentProvider $payments): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $setup = $payments->createSetupIntent($user);

        return response()->json([
            'data' => [
                'type' => 'setup_intent',
                'provider' => $setup->provider,
                'setup_intent_id' => $setup->setupIntentId,
                'client_secret' => $setup->clientSecret,
            ],
        ], 201);
    }

    public function pledge(
        StoreFoundingPledgeRequest $request,
        CreateFoundingPledgeAction $createPledge,
    ): JsonResponse {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $validated = $request->validated();

        $result = $createPledge->execute(
            $user,
            (int) $validated['drop_count'],
            (string) $validated['setup_intent_id'],
            (string) $validated['idempotency_key'],
        );

        return (new ReservationResource($result['reservation']))
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }

    public function myReservation(Request $request, ResolveFoundingCampaignAction $resolve): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $campaign = $resolve->execute();

        $reservation = Reservation::query()
            ->where('campaign_id', $campaign->id)
            ->where('supporter_id', $user->id)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Active,
                ReservationStatus::Failed,
                ReservationStatus::ConvertedToPayment,
            ])
            ->with(['campaign', 'priceSnapshot'])
            ->latest('id')
            ->first();

        if ($reservation === null) {
            return response()->json(['message' => 'No founding reservation found.'], 404);
        }

        return ReservationResource::make($reservation)->response();
    }
}
