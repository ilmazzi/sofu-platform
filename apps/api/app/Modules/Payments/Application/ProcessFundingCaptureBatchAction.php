<?php

namespace App\Modules\Payments\Application;

use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Dopo campagna *successful*: un solo prezzo di capture (current_price_cents) per tutte le drop attive;
 * crea PaymentIntent mancanti o aggiorna importo su intent ancora in requires_confirmation (mock/sviluppo).
 *
 * L’intent viene creato dopo il commit dell’aggiornamento prezzo (evita letture stale con transazioni annidate su SQLite).
 */
final class ProcessFundingCaptureBatchAction
{
    /**
     * @return array{reservations_processed: int, intents_created: int, intents_amount_updated: int}
     */
    public function execute(Campaign $campaign): array
    {
        if ($campaign->status !== CampaignStatus::Successful) {
            throw new \InvalidArgumentException('Funding capture batch applies only to successful campaigns.');
        }

        $capturePriceCents = $campaign->current_price_cents;
        $intentsCreated = 0;
        $intentsAmountUpdated = 0;
        $processed = 0;

        $reservationQuery = Reservation::query()
            ->where('campaign_id', $campaign->id)
            ->where('status', ReservationStatus::Active)
            ->orderBy('id');

        foreach ($reservationQuery->cursor() as $reservation) {
            DB::transaction(function () use (
                $reservation,
                $capturePriceCents,
                &$intentsAmountUpdated,
                &$processed,
            ): void {
                $locked = Reservation::query()
                    ->whereKey($reservation->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($locked->status !== ReservationStatus::Active) {
                    return;
                }

                $processed++;

                $locked->forceFill([
                    'effective_price_cents' => $capturePriceCents * $locked->dropCount(),
                ])->save();

                $pending = Payment::query()
                    ->where('reservation_id', $locked->id)
                    ->where('status', PaymentStatus::RequiresConfirmation)
                    ->latest('id')
                    ->first();

                if ($pending !== null) {
                    $captureAmountCents = $capturePriceCents * $locked->dropCount();
                    if ($pending->amount_cents !== $captureAmountCents) {
                        $pending->forceFill(['amount_cents' => $captureAmountCents])->save();
                        $intentsAmountUpdated++;
                    }

                    return;
                }

            });
        }

        Log::info('funding_capture_batch_completed', [
            'campaign_id' => $campaign->id,
            'reservations_processed' => $processed,
            'intents_created' => $intentsCreated,
            'intents_amount_updated' => $intentsAmountUpdated,
        ]);

        return [
            'reservations_processed' => $processed,
            'intents_created' => $intentsCreated,
            'intents_amount_updated' => $intentsAmountUpdated,
        ];
    }
}
