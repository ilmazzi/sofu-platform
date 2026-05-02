<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_supporter_can_create_mock_payment_intent_for_own_reservation(): void
    {
        [$supporter, $reservation] = $this->createReservation();

        $this
            ->actingAs($supporter)
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertCreated()
            ->assertJsonPath('data.type', 'payment')
            ->assertJsonPath('data.provider', 'mock')
            ->assertJsonPath('data.status', PaymentStatus::RequiresConfirmation->value)
            ->assertJsonPath('data.amount_cents', $reservation->effective_price_cents)
            ->assertJsonPath('data.currency', 'EUR')
            ->assertJsonStructure(['data' => ['provider_client_secret']]);

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $reservation->id,
            'status' => PaymentStatus::RequiresConfirmation->value,
            'amount_cents' => $reservation->effective_price_cents,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'payment.intent_created',
        ]);
    }

    public function test_supporter_cannot_create_payment_intent_for_another_supporters_reservation(): void
    {
        [, $reservation] = $this->createReservation();

        $this
            ->actingAs(User::factory()->create())
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertForbidden();
    }

    public function test_payment_intent_creation_reuses_existing_pending_payment(): void
    {
        [$supporter, $reservation] = $this->createReservation();

        $first = $this
            ->actingAs($supporter)
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertCreated();

        $this
            ->actingAs($supporter)
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertOk()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_mock_webhook_can_authorize_payment_idempotently(): void
    {
        $payment = $this->createPayment();

        $payload = [
            'event_id' => 'evt_authorized_1',
            'type' => 'payment.authorized',
            'provider_payment_id' => $payment->provider_payment_id,
        ];

        $this
            ->postJson('/api/v1/payments/webhooks/mock', $payload)
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Authorized->value);

        $this
            ->postJson('/api/v1/payments/webhooks/mock', $payload)
            ->assertOk()
            ->assertJsonPath('payment_status', PaymentStatus::Authorized->value);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => PaymentStatus::Authorized->value,
        ]);
        $this->assertDatabaseCount('payment_provider_events', 1);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'payment.authorized',
            'target_id' => $payment->id,
        ]);
    }

    public function test_mock_webhook_can_capture_payment_and_convert_reservation(): void
    {
        $payment = $this->createPayment();

        $this
            ->postJson('/api/v1/payments/webhooks/mock', [
                'event_id' => 'evt_captured_1',
                'type' => 'payment.captured',
                'provider_payment_id' => $payment->provider_payment_id,
            ])
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Captured->value);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => PaymentStatus::Captured->value,
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $payment->reservation_id,
            'status' => ReservationStatus::ConvertedToPayment->value,
        ]);
    }

    public function test_mock_webhook_can_fail_payment_and_reservation(): void
    {
        $payment = $this->createPayment();

        $this
            ->postJson('/api/v1/payments/webhooks/mock', [
                'event_id' => 'evt_failed_1',
                'type' => 'payment.failed',
                'provider_payment_id' => $payment->provider_payment_id,
                'failure_reason' => 'Card declined.',
            ])
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Failed->value);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => PaymentStatus::Failed->value,
            'failure_reason' => 'Card declined.',
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $payment->reservation_id,
            'status' => ReservationStatus::Failed->value,
        ]);
    }

    public function test_stripe_webhook_requires_valid_signature(): void
    {
        config(['payments.stripe.webhook_secret' => 'whsec_test_sofu']);

        $this->call('POST', '/api/v1/payments/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.time().',v1=invalid',
        ], '{"id":"evt_x"}')
            ->assertBadRequest();
    }

    public function test_stripe_webhook_payment_intent_succeeded_is_idempotent(): void
    {
        config(['payments.stripe.webhook_secret' => 'whsec_test_sofu']);

        $payment = $this->createStripePayment();
        $payload = $this->stripeEventPayload('evt_stripe_pi_ok', 'payment_intent.succeeded', $payment->provider_payment_id);
        $header = $this->stripeSignatureHeader($payload, 'whsec_test_sofu');

        $this->call('POST', '/api/v1/payments/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $header,
        ], $payload)
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Captured->value);

        $this->call('POST', '/api/v1/payments/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $header,
        ], $payload)
            ->assertOk()
            ->assertJsonPath('payment_status', PaymentStatus::Captured->value);

        $this->assertDatabaseCount('payment_provider_events', 1);
        $this->assertDatabaseHas('reservations', [
            'id' => $payment->reservation_id,
            'status' => ReservationStatus::ConvertedToPayment->value,
        ]);
    }

    public function test_stripe_webhook_payment_intent_failed_updates_reservation(): void
    {
        config(['payments.stripe.webhook_secret' => 'whsec_test_sofu']);

        $payment = $this->createStripePayment();
        $payload = json_encode([
            'id' => 'evt_stripe_pi_fail',
            'object' => 'event',
            'type' => 'payment_intent.payment_failed',
            'data' => [
                'object' => [
                    'id' => $payment->provider_payment_id,
                    'last_payment_error' => ['message' => 'Your card was declined.'],
                ],
            ],
        ], JSON_THROW_ON_ERROR);
        $header = $this->stripeSignatureHeader($payload, 'whsec_test_sofu');

        $this->call('POST', '/api/v1/payments/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $header,
        ], $payload)
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Failed->value);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => PaymentStatus::Failed->value,
            'failure_reason' => 'Your card was declined.',
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $payment->reservation_id,
            'status' => ReservationStatus::Failed->value,
        ]);
    }

    /**
     * @return array{0: User, 1: Reservation}
     */
    private function createReservation(): array
    {
        $supporter = User::factory()->create();
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
        ]);

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'payment-reservation-'.uniqid())
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        return [
            $supporter,
            Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail(),
        ];
    }

    private function createPayment(): Payment
    {
        [$supporter, $reservation] = $this->createReservation();

        $this
            ->actingAs($supporter)
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertCreated();

        return Payment::query()->where('reservation_id', $reservation->id)->firstOrFail();
    }

    private function createStripePayment(): Payment
    {
        [$supporter, $reservation] = $this->createReservation();

        return Payment::query()->create([
            'reservation_id' => $reservation->id,
            'provider' => 'stripe',
            'provider_payment_id' => 'pi_test_'.uniqid(),
            'status' => PaymentStatus::RequiresConfirmation,
            'amount_cents' => $reservation->effective_price_cents,
            'currency' => 'EUR',
            'client_secret' => 'pi_test_secret',
        ]);
    }

    private function stripeEventPayload(string $eventId, string $type, string $paymentIntentId): string
    {
        return json_encode([
            'id' => $eventId,
            'object' => 'event',
            'type' => $type,
            'data' => [
                'object' => [
                    'id' => $paymentIntentId,
                ],
            ],
        ], JSON_THROW_ON_ERROR);
    }

    private function stripeSignatureHeader(string $payload, string $secret): string
    {
        $timestamp = time();
        $signedPayload = $timestamp.'.'.$payload;
        $signature = hash_hmac('sha256', $signedPayload, $secret);

        return 't='.$timestamp.',v1='.$signature;
    }
}
