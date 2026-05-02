<?php

namespace App\Modules\Reservations\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Notifications\Infrastructure\Notifications\ReservationCreatedNotification;
use App\Modules\Pricing\Domain\CampaignPriceCalculator;
use App\Modules\Pricing\Infrastructure\Eloquent\CampaignPriceSnapshot;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CreateReservationAction
{
    public function __construct(
        private readonly CampaignPriceCalculator $priceCalculator,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array{reservation: Reservation, created: bool}
     */
    public function execute(Campaign $campaign, User $supporter, string $idempotencyKey): array
    {
        $payloadHash = hash('sha256', implode(':', [
            'campaign',
            $campaign->id,
            'supporter',
            $supporter->id,
        ]));

        $result = DB::transaction(function () use ($campaign, $supporter, $idempotencyKey, $payloadHash): array {
            $existing = Reservation::query()
                ->where('supporter_id', $supporter->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing !== null) {
                if (! hash_equals($existing->payload_hash, $payloadHash)) {
                    throw new ConflictHttpException('Idempotency key was already used with a different request.');
                }

                return [
                    'reservation' => $existing->load(['campaign', 'priceSnapshot']),
                    'created' => false,
                ];
            }

            $lockedCampaign = Campaign::query()
                ->whereKey($campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedCampaign->status, [CampaignStatus::Published, CampaignStatus::Activated], true)) {
                throw new ConflictHttpException('Campaign is not open for reservations.');
            }

            if (Reservation::query()->where('campaign_id', $lockedCampaign->id)->where('supporter_id', $supporter->id)->exists()) {
                throw new ConflictHttpException('Supporter already has a reservation for this campaign.');
            }

            $priceQuotedCents = $lockedCampaign->current_price_cents;
            $activeReservationsCount = $lockedCampaign->active_reservations_count + 1;
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
                'reason' => 'reservation_created',
            ]);

            $reservation = Reservation::create([
                'campaign_id' => $lockedCampaign->id,
                'supporter_id' => $supporter->id,
                'status' => ReservationStatus::Active,
                'price_quoted_cents' => $priceQuotedCents,
                'effective_price_cents' => $effectivePriceCents,
                'price_snapshot_id' => $snapshot->id,
                'idempotency_key' => $idempotencyKey,
                'payload_hash' => $payloadHash,
            ]);

            $lockedCampaign->forceFill([
                'active_reservations_count' => $activeReservationsCount,
                'current_price_cents' => $effectivePriceCents,
            ])->save();

            $this->audit->record('reservation.created', $supporter, $reservation, [
                'campaign_id' => $lockedCampaign->id,
                'price_quoted_cents' => $priceQuotedCents,
                'effective_price_cents' => $effectivePriceCents,
            ]);

            $this->audit->record('campaign.price_changed', $supporter, $lockedCampaign, [
                'active_reservations_count' => $activeReservationsCount,
                'previous_price_cents' => $priceQuotedCents,
                'current_price_cents' => $effectivePriceCents,
                'price_snapshot_id' => $snapshot->id,
            ]);

            return [
                'reservation' => $reservation->load(['campaign', 'priceSnapshot']),
                'created' => true,
            ];
        });

        if ($result['created']) {
            $reservation = $result['reservation']->loadMissing('supporter', 'campaign');
            $reservation->supporter?->notify(new ReservationCreatedNotification($reservation));
        }

        return $result;
    }
}
