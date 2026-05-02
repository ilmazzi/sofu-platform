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
}
