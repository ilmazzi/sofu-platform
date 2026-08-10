<?php

namespace App\Modules\Reservations\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Pricing\Domain\CampaignPriceCalculator;
use App\Modules\Pricing\Infrastructure\Eloquent\CampaignPriceSnapshot;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AddReservationDropsAction
{
    public function __construct(
        private readonly CampaignPriceCalculator $priceCalculator,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Reservation $reservation, User $supporter, int $additionalDrops): Reservation
    {
        $additionalDrops = max(1, min(10_000, $additionalDrops));

        return DB::transaction(function () use ($reservation, $supporter, $additionalDrops): Reservation {
            $locked = Reservation::query()
                ->whereKey($reservation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->supporter_id !== $supporter->id) {
                throw new ConflictHttpException('You cannot modify this reservation.');
            }

            if ($locked->status !== ReservationStatus::Active) {
                throw new ConflictHttpException('Only an active commitment can receive more drops.');
            }

            $lockedCampaign = $locked->campaign()->lockForUpdate()->firstOrFail();

            if (! in_array($lockedCampaign->status, [CampaignStatus::Published, CampaignStatus::Activated], true)) {
                throw new ConflictHttpException('Campaign is not open for reservations.');
            }

            $activeReservationsCount = $lockedCampaign->active_reservations_count + $additionalDrops;
            $newDropCount = $locked->dropCount() + $additionalDrops;

            // Ricalcola tutto l’impegno a prezzo unitario corrente (quote × prezzo), senza somma marginale.
            $finalDropPriceCents = $this->priceCalculator->calculate(
                $lockedCampaign->total_amount_cents,
                $activeReservationsCount,
                $lockedCampaign->min_price_cents,
                $lockedCampaign->max_price_cents,
            );
            $pledgedTotalCents = $finalDropPriceCents * $newDropCount;

            $snapshot = CampaignPriceSnapshot::create([
                'campaign_id' => $lockedCampaign->id,
                'active_reservations_count' => $activeReservationsCount,
                'calculated_price_cents' => $finalDropPriceCents,
                'min_price_cents' => $lockedCampaign->min_price_cents,
                'max_price_cents' => $lockedCampaign->max_price_cents,
                'total_amount_cents' => $lockedCampaign->total_amount_cents,
                'reason' => 'reservation_drops_added',
            ]);

            $locked->forceFill([
                'effective_price_cents' => $pledgedTotalCents,
                'drop_count' => $newDropCount,
                'price_snapshot_id' => $snapshot->id,
            ])->save();

            $lockedCampaign->forceFill([
                'active_reservations_count' => $activeReservationsCount,
                'current_price_cents' => $finalDropPriceCents,
            ])->save();

            $this->audit->record(AuditActions::RESERVATION_DROPS_ADDED, $supporter, $locked, [
                'campaign_id' => $lockedCampaign->id,
                'additional_drop_count' => $additionalDrops,
                'drop_count' => $newDropCount,
                'effective_price_cents' => $pledgedTotalCents,
            ]);

            $this->audit->record(AuditActions::CAMPAIGN_PRICE_CHANGED, $supporter, $lockedCampaign, [
                'active_reservations_count' => $activeReservationsCount,
                'current_price_cents' => $finalDropPriceCents,
                'price_snapshot_id' => $snapshot->id,
            ]);

            return $locked->load(['campaign', 'priceSnapshot']);
        });
    }
}
