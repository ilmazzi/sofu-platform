<?php

namespace App\Modules\Payments\Application;

use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class CreatePaymentIntentAction
{
    public function __construct(
        private readonly PaymentProvider $provider,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Reservation $reservation): Payment
    {
        return DB::transaction(function () use ($reservation): Payment {
            $reservation->loadMissing('campaign');
            $campaign = $reservation->campaign;

            if (! in_array($reservation->status, [ReservationStatus::Active, ReservationStatus::Failed], true)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Questa drop non è in uno stato che consenta il pagamento.',
                ], 422));
            }

            if (! $campaign->hasReachedBloom()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Il pagamento si abilita al Bloom: quando la campagna raggiunge l’obiettivo sostenitori.',
                ], 422));
            }

            $existingPayment = Payment::query()
                ->where('reservation_id', $reservation->id)
                ->where('status', PaymentStatus::RequiresConfirmation)
                ->latest()
                ->first();

            if ($existingPayment !== null) {
                return $existingPayment;
            }

            $intent = $this->provider->createIntent($reservation);

            $payment = Payment::create([
                'reservation_id' => $reservation->id,
                'provider' => $intent->provider,
                'provider_payment_id' => $intent->providerPaymentId,
                'status' => PaymentStatus::RequiresConfirmation,
                'amount_cents' => $intent->amountCents,
                'currency' => $intent->currency,
                'client_secret' => $intent->clientSecret,
            ]);

            $this->audit->record(AuditActions::PAYMENT_INTENT_CREATED, $reservation->supporter, $payment, [
                'reservation_id' => $reservation->id,
                'provider' => $payment->provider,
                'amount_cents' => $payment->amount_cents,
                'currency' => $payment->currency,
            ]);

            return $payment;
        });
    }
}
