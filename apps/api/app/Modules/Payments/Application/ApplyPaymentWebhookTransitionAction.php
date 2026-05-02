<?php

namespace App\Modules\Payments\Application;

use App\Modules\Ledger\Application\RecordCapturedPaymentLedgerEntriesAction;
use App\Modules\Notifications\Infrastructure\Notifications\PaymentCapturedNotification;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;

class ApplyPaymentWebhookTransitionAction
{
    public function __construct(
        private readonly RecordCapturedPaymentLedgerEntriesAction $recordLedgerEntries,
    ) {}

    public function markAuthorized(Payment $payment): void
    {
        $payment->forceFill([
            'status' => PaymentStatus::Authorized,
            'authorized_at' => now(),
            'failure_reason' => null,
        ])->save();
    }

    public function markCaptured(Payment $payment): void
    {
        $payment->forceFill([
            'status' => PaymentStatus::Captured,
            'captured_at' => now(),
            'failure_reason' => null,
        ])->save();
        $payment->reservation()->update(['status' => ReservationStatus::ConvertedToPayment]);
        $payment = $payment->fresh(['reservation.supporter', 'reservation.campaign']);
        $this->recordLedgerEntries->execute($payment);
        $payment->reservation?->supporter?->notify(new PaymentCapturedNotification($payment));
    }

    public function markFailed(Payment $payment, ?string $reason): void
    {
        $payment->forceFill([
            'status' => PaymentStatus::Failed,
            'failure_reason' => $reason ?? 'Payment failed.',
        ])->save();
        $payment->reservation()->update(['status' => ReservationStatus::Failed]);
    }
}
