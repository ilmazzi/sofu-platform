<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Models\User;
use App\Modules\Backoffice\Http\Requests\BackofficeRequest;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Http\JsonResponse;

class BackofficeStatsController
{
    public function index(BackofficeRequest $request): JsonResponse
    {
        $totalUsers = User::count();
        $totalCampaigns = Campaign::count();
        $totalReservations = Reservation::query()
            ->whereNotIn('status', [
                ReservationStatus::Cancelled,
                ReservationStatus::Expired,
                ReservationStatus::Failed,
            ])
            ->count();
        $totalRevenueCents = (int) Reservation::query()
            ->where('status', ReservationStatus::ConvertedToPayment)
            ->sum('effective_price_cents');
        $campaignsInReview = Campaign::query()
            ->where('status', CampaignStatus::SubmittedForReview)
            ->count();
        $campaignsPublished = Campaign::query()
            ->where('status', CampaignStatus::Published)
            ->count();

        return response()->json([
            'total_users' => $totalUsers,
            'total_campaigns' => $totalCampaigns,
            'total_reservations' => $totalReservations,
            'total_revenue_cents' => $totalRevenueCents,
            'campaigns_in_review' => $campaignsInReview,
            'campaigns_published' => $campaignsPublished,
        ]);
    }
}
