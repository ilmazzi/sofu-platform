<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Application\ProcessFundingCaptureBatchAction;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class FundingCaptureBatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_closure_dispatches_capture_batch_and_creates_payment_intents(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-01 12:00:00'));

        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 1,
            'current_price_cents' => 4_200,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'active_reservations_count' => 0,
            'ends_at' => Carbon::parse('2026-06-30 23:59:59'),
        ]);

        $a = User::factory()->create();
        $b = User::factory()->create();

        $this->actingAs($a)->withHeader('Idempotency-Key', 'cap-a')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();
        $this->actingAs($b)->withHeader('Idempotency-Key', 'cap-b')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();

        $campaign->refresh();
        $this->assertSame(2, $campaign->active_reservations_count);

        // Prezzo di capture = current_price campagna all’istante del batch (stesso che usa il motore prezzi dopo le drop).
        $capturePriceCents = $campaign->current_price_cents;

        app(\App\Modules\Campaigns\Application\ProcessCampaignFundingClosuresAction::class)->execute(now());

        $campaign->refresh();
        $this->assertSame(CampaignStatus::Successful, $campaign->status);

        $this->assertSame(2, Payment::query()->where('status', PaymentStatus::RequiresConfirmation)->count());
        foreach (Payment::query()->where('status', PaymentStatus::RequiresConfirmation)->get() as $payment) {
            $this->assertSame($capturePriceCents, $payment->amount_cents);
        }
    }

    public function test_process_funding_capture_batch_action_directly(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'status' => CampaignStatus::Successful,
            'target_supporters' => 5,
            'current_price_cents' => 3_300,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'active_reservations_count' => 1,
            'ends_at' => now()->subDay(),
        ]);

        $supporter = User::factory()->create();
        \App\Modules\Reservations\Infrastructure\Eloquent\Reservation::query()->create([
            'campaign_id' => $campaign->id,
            'supporter_id' => $supporter->id,
            'status' => \App\Modules\Reservations\Domain\Enums\ReservationStatus::Active,
            'price_quoted_cents' => 5000,
            'effective_price_cents' => 1111,
            'price_snapshot_id' => null,
            'idempotency_key' => 'manual-'.uniqid(),
            'payload_hash' => hash('sha256', 'x'),
        ]);

        $result = app(ProcessFundingCaptureBatchAction::class)->execute($campaign->fresh());

        $this->assertSame(1, $result['reservations_processed']);
        $this->assertSame(1, $result['intents_created']);

        $payment = Payment::query()->firstOrFail();
        $this->assertSame(3_300, $payment->amount_cents);
        $this->assertSame(3_300, $payment->reservation->effective_price_cents);
    }
}
