<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Models\User;
use App\Modules\Backoffice\Http\Requests\BackofficeRequest;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Http\JsonResponse;

class BackofficeStatsController
{
    public function index(BackofficeRequest $request): JsonResponse
    {
        $totalUsers = User::count();
        $totalCampaigns = Campaign::count();
        $totalReservations = Reservation::where('status', 'confirmed')->count();
        $totalRevenueCents = Reservation::where('status', 'confirmed')->sum('amount_cents');
        $campaignsInReview = Campaign::where('status', 'in_review')->count();
        $campaignsPublished = Campaign::where('status', 'published')->count();

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
