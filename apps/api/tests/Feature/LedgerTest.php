<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Ledger\Domain\LedgerAccounts;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditActions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_captured_payment_records_append_only_ledger_entries(): void
    {
        [$payment, $campaign] = $this->createPayment(amountCents: 5000);

        $this
            ->postJson('/api/v1/payments/webhooks/mock', [
                'event_id' => 'evt_ledger_capture',
                'type' => 'payment.captured',
                'provider_payment_id' => $payment->provider_payment_id,
            ])
            ->assertCreated()
            ->assertJsonPath('payment_status', PaymentStatus::Captured->value);

        $this->assertDatabaseCount('ledger_entries', 4);
        $this->assertDatabaseHas('ledger_entries', [
            'account' => LedgerAccounts::PLATFORM_CASH,
            'direction' => 'credit',
            'amount_cents' => 5000,
            'source_id' => $payment->id,
        ]);
        $this->assertDatabaseHas('ledger_entries', [
            'account' => LedgerAccounts::PROVIDER_FEES,
            'direction' => 'debit',
            'amount_cents' => 135,
            'source_id' => $payment->id,
        ]);
        $this->assertDatabaseHas('ledger_entries', [
            'account' => LedgerAccounts::SOFU_REVENUE,
            'direction' => 'credit',
            'amount_cents' => 115,
            'source_id' => $payment->id,
        ]);
        $this->assertDatabaseHas('ledger_entries', [
            'account' => LedgerAccounts::creatorPayable($campaign->creator_id),
            'direction' => 'credit',
            'amount_cents' => 4750,
            'source_id' => $payment->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditActions::LEDGER_ENTRIES_RECORDED,
            'target_id' => $payment->id,
        ]);
    }

    public function test_payment_provider_event_retry_does_not_duplicate_ledger_entries(): void
    {
        [$payment] = $this->createPayment(amountCents: 5000);
        $payload = [
            'event_id' => 'evt_ledger_retry',
            'type' => 'payment.captured',
            'provider_payment_id' => $payment->provider_payment_id,
        ];

        $this->postJson('/api/v1/payments/webhooks/mock', $payload)->assertCreated();
        $this->postJson('/api/v1/payments/webhooks/mock', $payload)->assertOk();

        $this->assertDatabaseCount('ledger_entries', 4);
    }

    public function test_operator_can_list_ledger_entries(): void
    {
        [$payment] = $this->createPayment(amountCents: 5000);

        $this
            ->postJson('/api/v1/payments/webhooks/mock', [
                'event_id' => 'evt_backoffice_ledger',
                'type' => 'payment.captured',
                'provider_payment_id' => $payment->provider_payment_id,
            ])
            ->assertCreated();

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/ledger-entries?account='.urlencode(LedgerAccounts::SOFU_REVENUE))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.account', LedgerAccounts::SOFU_REVENUE)
            ->assertJsonPath('data.0.amount_cents', 115);
    }

    /**
     * @return array{0: Payment, 1: Campaign}
     */
    private function createPayment(int $amountCents): array
    {
        $supporter = User::factory()->create();
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => $creator->id,
            'total_amount_cents' => $amountCents,
            'min_price_cents' => 1000,
            'max_price_cents' => $amountCents,
            'current_price_cents' => $amountCents,
        ]);

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'ledger-reservation-'.uniqid())
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail();

        $this
            ->actingAs($supporter)
            ->postJson("/api/v1/reservations/{$reservation->id}/payment-intent")
            ->assertCreated();

        return [
            Payment::query()->where('reservation_id', $reservation->id)->firstOrFail(),
            $campaign,
        ];
    }
}
