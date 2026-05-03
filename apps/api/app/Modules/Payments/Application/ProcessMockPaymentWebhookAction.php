<?php

namespace App\Modules\Payments\Application;

use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Payments\Infrastructure\Eloquent\PaymentProviderEvent;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProcessMockPaymentWebhookAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ApplyPaymentWebhookTransitionAction $applyTransitions,
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

            $this->applyMockPayload($payment, $payload);

            $payment = $payment->fresh();

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
    private function applyMockPayload(Payment $payment, array $payload): void
    {
        if ($payload['type'] === 'payment.authorized') {
            $this->applyTransitions->markAuthorized($payment);

            return;
        }

        if ($payload['type'] === 'payment.captured') {
            $this->applyTransitions->markCaptured($payment);

            return;
        }

        if ($payload['type'] === 'payment.failed') {
            $this->applyTransitions->markFailed($payment, $payload['failure_reason'] ?? null);
        }
    }

    private function auditAction(PaymentStatus $status): string
    {
        return match ($status) {
            PaymentStatus::Authorized => AuditActions::PAYMENT_AUTHORIZED,
            PaymentStatus::Captured => AuditActions::PAYMENT_CAPTURED,
            PaymentStatus::Failed => AuditActions::PAYMENT_FAILED,
            default => AuditActions::PAYMENT_UPDATED,
        };
    }
}
