<?php

namespace App\Modules\Payments\Application;

use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Payments\Infrastructure\Eloquent\PaymentProviderEvent;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use JsonException;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Exception\UnexpectedValueException;
use Stripe\Webhook;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProcessStripeWebhookAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ApplyPaymentWebhookTransitionAction $applyTransitions,
    ) {}

    /**
     * @return array{event: PaymentProviderEvent, payment: Payment|null, created: bool}
     */
    public function execute(string $payload, string $signatureHeader): array
    {
        $secret = config('payments.stripe.webhook_secret');
        if (! is_string($secret) || $secret === '') {
            throw new BadRequestHttpException('Stripe webhook is not configured.');
        }

        try {
            $event = Webhook::constructEvent($payload, $signatureHeader, $secret);
        } catch (UnexpectedValueException|SignatureVerificationException) {
            throw new BadRequestHttpException('Invalid Stripe webhook payload or signature.');
        }

        return DB::transaction(function () use ($event, $payload): array {
            $existingEvent = PaymentProviderEvent::query()
                ->where('provider', 'stripe')
                ->where('provider_event_id', $event->id)
                ->first();

            if ($existingEvent !== null) {
                return [
                    'event' => $existingEvent,
                    'payment' => $this->findPaymentForStripeEvent($event),
                    'created' => false,
                ];
            }

            if (! in_array($event->type, ['payment_intent.succeeded', 'payment_intent.payment_failed'], true)) {
                $row = PaymentProviderEvent::create([
                    'provider' => 'stripe',
                    'provider_event_id' => $event->id,
                    'event_type' => $event->type,
                    'payload' => $this->decodePayload($payload),
                    'processed_at' => now(),
                ]);

                return [
                    'event' => $row,
                    'payment' => null,
                    'created' => true,
                ];
            }

            $payment = Payment::query()
                ->where('provider', 'stripe')
                ->where('provider_payment_id', $event->data->object->id)
                ->lockForUpdate()
                ->first();

            if ($payment === null) {
                throw new NotFoundHttpException('Payment not found for this Stripe event.');
            }

            $eventRow = PaymentProviderEvent::create([
                'provider' => 'stripe',
                'provider_event_id' => $event->id,
                'event_type' => $event->type,
                'payload' => $this->decodePayload($payload),
                'processed_at' => now(),
            ]);

            if ($event->type === 'payment_intent.succeeded') {
                $this->applyTransitions->markCaptured($payment);
            } else {
                $object = $event->data->object;
                $reason = isset($object->last_payment_error) && is_object($object->last_payment_error)
                    ? ($object->last_payment_error->message ?? null)
                    : null;
                $this->applyTransitions->markFailed($payment, is_string($reason) ? $reason : null);
            }

            $payment = $payment->fresh();

            $this->audit->record($this->auditAction($payment->status), null, $payment, [
                'provider' => 'stripe',
                'provider_event_id' => $eventRow->provider_event_id,
                'provider_payment_id' => $payment->provider_payment_id,
            ]);

            return [
                'event' => $eventRow,
                'payment' => $payment,
                'created' => true,
            ];
        });
    }

    private function findPaymentForStripeEvent(Event $event): ?Payment
    {
        $id = $event->data->object->id ?? null;

        if (! is_string($id) || $id === '') {
            return null;
        }

        return Payment::query()
            ->where('provider', 'stripe')
            ->where('provider_payment_id', $id)
            ->first();
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

    /**
     * @return array<string, mixed>
     */
    private function decodePayload(string $payload): array
    {
        try {
            $data = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new BadRequestHttpException('Invalid JSON webhook payload.');
        }

        return is_array($data) ? $data : [];
    }
}
