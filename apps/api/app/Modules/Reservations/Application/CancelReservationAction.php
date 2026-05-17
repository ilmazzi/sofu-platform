<?php

namespace App\Modules\Reservations\Application;

use App\Models\User;
use App\Modules\Pricing\Domain\CampaignPriceCalculator;
use App\Modules\Pricing\Infrastructure\Eloquent\CampaignPriceSnapshot;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CancelReservationAction
{
    public function __construct(
        private readonly CampaignPriceCalculator $priceCalculator,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Reservation $reservation, User $actor): Reservation
    {
        return DB::transaction(function () use ($reservation, $actor): Reservation {
            $lockedReservation = Reservation::query()
                ->whereKey($reservation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedReservation->status !== ReservationStatus::Active) {
                throw new ConflictHttpException('Only active reservations can be cancelled.');
            }

            $lockedCampaign = $lockedReservation->campaign()->lockForUpdate()->firstOrFail();
            $previousCampaignPriceCents = $lockedCampaign->current_price_cents;

            if ($lockedCampaign->hasReachedBloom()) {
                throw new ConflictHttpException('Cannot cancel after the campaign reached Bloom.');
            }

            $lockedReservation->forceFill(['status' => ReservationStatus::Cancelled])->save();

            $activeReservationsCount = max(
                0,
                $lockedCampaign->active_reservations_count - $lockedReservation->dropCount(),
            );
            $effectivePriceCents = $this->priceCalculator->calculate(
                $lockedCampaign->total_amount_cents,
                $activeReservationsCount,
                $lockedCampaign->min_price_cents,
                $lockedCampaign->max_price_cents,
            );

            $snapshot = CampaignPriceSnapshot::create([
                'campaign_id' => $lockedCampaign->id,
                'active_reservations_count' => $activeReservationsCount,
                'calculated_price_cents' => $effectivePriceCents,
                'min_price_cents' => $lockedCampaign->min_price_cents,
                'max_price_cents' => $lockedCampaign->max_price_cents,
                'total_amount_cents' => $lockedCampaign->total_amount_cents,
                'reason' => 'reservation_cancelled',
            ]);

            $lockedCampaign->forceFill([
                'active_reservations_count' => $activeReservationsCount,
                'current_price_cents' => $effectivePriceCents,
            ])->save();

            $this->audit->record(AuditActions::RESERVATION_CANCELLED, $actor, $lockedReservation, [
                'campaign_id' => $lockedCampaign->id,
            ]);

            $this->audit->record(AuditActions::CAMPAIGN_PRICE_CHANGED, $actor, $lockedCampaign, [
                'active_reservations_count' => $activeReservationsCount,
                'previous_price_cents' => $previousCampaignPriceCents,
                'current_price_cents' => $effectivePriceCents,
                'price_snapshot_id' => $snapshot->id,
            ]);

            return $lockedReservation->load(['campaign', 'priceSnapshot']);
        });
    }
}
