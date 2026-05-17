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
use App\Support\Audit\AuditActions;
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
    public function execute(Campaign $campaign, User $supporter, string $idempotencyKey, int $dropCount = 1): array
    {
        $dropCount = max(1, min(10_000, $dropCount));

        $payloadHash = hash('sha256', implode(':', [
            'campaign',
            $campaign->id,
            'supporter',
            $supporter->id,
            'drops',
            $dropCount,
        ]));

        $result = DB::transaction(function () use ($campaign, $supporter, $idempotencyKey, $payloadHash, $dropCount): array {
            $existing = Reservation::query()
                ->where('supporter_id', $supporter->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing !== null) {
                if (! hash_equals($existing->payload_hash, $payloadHash)) {
                    throw new ConflictHttpException('Idempotency key was already used with a different request.');
                }

                $canReactivate = in_array($existing->status, [
                    ReservationStatus::Cancelled,
                    ReservationStatus::Expired,
                ], true);

                if (! $canReactivate) {
                    return [
                        'reservation' => $existing->load(['campaign', 'priceSnapshot']),
                        'created' => false,
                    ];
                }
            }

            $lockedCampaign = Campaign::query()
                ->whereKey($campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedCampaign->status, [CampaignStatus::Published, CampaignStatus::Activated], true)) {
                throw new ConflictHttpException('Campaign is not open for reservations.');
            }

            $blockingStatuses = [
                ReservationStatus::Pending,
                ReservationStatus::Active,
                ReservationStatus::Failed,
                ReservationStatus::ConvertedToPayment,
            ];

            if (Reservation::query()
                ->where('campaign_id', $lockedCampaign->id)
                ->where('supporter_id', $supporter->id)
                ->whereIn('status', $blockingStatuses)
                ->exists()) {
                throw new ConflictHttpException('Supporter already has a reservation for this campaign.');
            }

            $reuseReservation = Reservation::query()
                ->where('campaign_id', $lockedCampaign->id)
                ->where('supporter_id', $supporter->id)
                ->whereIn('status', [ReservationStatus::Cancelled, ReservationStatus::Expired])
                ->lockForUpdate()
                ->first();

            if ($reuseReservation !== null && $existing !== null && $reuseReservation->id !== $existing->id) {
                throw new ConflictHttpException('Supporter already has a reservation for this campaign.');
            }

            $priceQuotedCents = $lockedCampaign->current_price_cents;
            $activeReservationsCount = $lockedCampaign->active_reservations_count;
            $pledgedTotalCents = 0;

            for ($i = 0; $i < $dropCount; $i++) {
                $activeReservationsCount++;
                $pledgedTotalCents += $this->priceCalculator->calculate(
                    $lockedCampaign->total_amount_cents,
                    $activeReservationsCount,
                    $lockedCampaign->min_price_cents,
                    $lockedCampaign->max_price_cents,
                );
            }

            $effectivePriceCents = $pledgedTotalCents;
            $finalDropPriceCents = $this->priceCalculator->calculate(
                $lockedCampaign->total_amount_cents,
                $activeReservationsCount,
                $lockedCampaign->min_price_cents,
                $lockedCampaign->max_price_cents,
            );

            $snapshotReason = $reuseReservation !== null ? 'reservation_reactivated' : 'reservation_created';

            $snapshot = CampaignPriceSnapshot::create([
                'campaign_id' => $lockedCampaign->id,
                'active_reservations_count' => $activeReservationsCount,
                'calculated_price_cents' => $finalDropPriceCents,
                'min_price_cents' => $lockedCampaign->min_price_cents,
                'max_price_cents' => $lockedCampaign->max_price_cents,
                'total_amount_cents' => $lockedCampaign->total_amount_cents,
                'reason' => $snapshotReason,
            ]);

            if ($reuseReservation !== null) {
                $reuseReservation->forceFill([
                    'status' => ReservationStatus::Active,
                    'price_quoted_cents' => $priceQuotedCents,
                    'effective_price_cents' => $effectivePriceCents,
                    'drop_count' => $dropCount,
                    'price_snapshot_id' => $snapshot->id,
                    'idempotency_key' => $idempotencyKey,
                    'payload_hash' => $payloadHash,
                ])->save();
                $reservation = $reuseReservation;
            } else {
                $reservation = Reservation::create([
                    'campaign_id' => $lockedCampaign->id,
                    'supporter_id' => $supporter->id,
                    'status' => ReservationStatus::Active,
                    'price_quoted_cents' => $priceQuotedCents,
                    'effective_price_cents' => $effectivePriceCents,
                    'drop_count' => $dropCount,
                    'price_snapshot_id' => $snapshot->id,
                    'idempotency_key' => $idempotencyKey,
                    'payload_hash' => $payloadHash,
                ]);
            }

            $lockedCampaign->forceFill([
                'active_reservations_count' => $activeReservationsCount,
                'current_price_cents' => $finalDropPriceCents,
            ])->save();

            $this->audit->record(AuditActions::RESERVATION_CREATED, $supporter, $reservation, [
                'campaign_id' => $lockedCampaign->id,
                'price_quoted_cents' => $priceQuotedCents,
                'effective_price_cents' => $effectivePriceCents,
                'drop_count' => $dropCount,
            ]);

            $this->audit->record(AuditActions::CAMPAIGN_PRICE_CHANGED, $supporter, $lockedCampaign, [
                'active_reservations_count' => $activeReservationsCount,
                'previous_price_cents' => $priceQuotedCents,
                'current_price_cents' => $finalDropPriceCents,
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
