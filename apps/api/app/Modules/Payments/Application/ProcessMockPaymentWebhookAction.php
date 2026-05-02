<?php

namespace App\Modules\Payments\Application;

use App\Modules\Ledger\Application\RecordCapturedPaymentLedgerEntriesAction;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Payments\Infrastructure\Eloquent\PaymentProviderEvent;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProcessMockPaymentWebhookAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly RecordCapturedPaymentLedgerEntriesAction $recordLedgerEntries,
    ) {}

    /**
     * @param  array{event_id: string, type: string, provider_payment_id: string, failure_reason?: string|null}  $payload
     * @return array{event: PaymentProviderEvent, payment: Payment|null, created: bool}
     */
    public function execute(array $payload): array
    {
        return DB::transaction(function () use ($payload): array {
            $existingEvent = PaymentProviderEvent::query()
                ->where('provider', 'mock')
                ->where('provider_event_id', $payload['event_id'])
                ->first();

            if ($existingEvent !== null) {
                return [
                    'event' => $existingEvent,
                    'payment' => Payment::query()->where('provider_payment_id', $payload['provider_payment_id'])->first(),
                    'created' => false,
                ];
            }

            $payment = Payment::query()
                ->where('provider', 'mock')
                ->where('provider_payment_id', $payload['provider_payment_id'])
                ->lockForUpdate()
                ->first();

            if ($payment === null) {
                throw new NotFoundHttpException('Payment not found.');
            }

            $event = PaymentProviderEvent::create([
                'provider' => 'mock',
                'provider_event_id' => $payload['event_id'],
                'event_type' => $payload['type'],
                'payload' => $payload,
                'processed_at' => now(),
            ]);

            $this->applyPaymentStatus($payment, $payload);

            $this->audit->record($this->auditAction($payment->status), null, $payment, [
                'provider' => 'mock',
                'provider_event_id' => $event->provider_event_id,
                'provider_payment_id' => $payment->provider_payment_id,
            ]);

            return [
                'event' => $event,
                'payment' => $payment->fresh(),
                'created' => true,
            ];
        });
    }

    /**
     * @param  array{type: string, failure_reason?: string|null}  $payload
     */
    private function applyPaymentStatus(Payment $payment, array $payload): void
    {
        if ($payload['type'] === 'payment.authorized') {
            $payment->forceFill([
                'status' => PaymentStatus::Authorized,
                'authorized_at' => now(),
                'failure_reason' => null,
            ])->save();

            return;
        }

        if ($payload['type'] === 'payment.captured') {
            $payment->forceFill([
                'status' => PaymentStatus::Captured,
                'captured_at' => now(),
                'failure_reason' => null,
            ])->save();
            $payment->reservation()->update(['status' => ReservationStatus::ConvertedToPayment]);
            $this->recordLedgerEntries->execute($payment->fresh());

            return;
        }

        if ($payload['type'] === 'payment.failed') {
            $payment->forceFill([
                'status' => PaymentStatus::Failed,
                'failure_reason' => $payload['failure_reason'] ?? 'Mock payment failed.',
            ])->save();
            $payment->reservation()->update(['status' => ReservationStatus::Failed]);
        }
    }

    private function auditAction(PaymentStatus $status): string
    {
        return match ($status) {
            PaymentStatus::Authorized => 'payment.authorized',
            PaymentStatus::Captured => 'payment.captured',
            PaymentStatus::Failed => 'payment.failed',
            default => 'payment.updated',
        };
    }
}
