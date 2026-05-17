<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Support\Audit\AuditActions;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_supporter_can_reserve_published_campaign_and_price_is_snapshotted(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'reservation-1')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated()
            ->assertJsonPath('data.type', 'reservation')
            ->assertJsonPath('data.status', ReservationStatus::Active->value)
            ->assertJsonPath('data.price_quoted_cents', 5000)
            ->assertJsonPath('data.effective_price_cents', 5000)
            ->assertJsonPath('data.price_snapshot.active_reservations_count', 1);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 1,
            'current_price_cents' => 5000,
        ]);

        $this->assertDatabaseHas('campaign_price_snapshots', [
            'campaign_id' => $campaign->id,
            'active_reservations_count' => 1,
            'calculated_price_cents' => 5000,
            'reason' => 'reservation_created',
        ]);
    }

    public function test_supporter_can_pledge_multiple_drops_in_one_reservation(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 40_000_00,
            'min_price_cents' => 500_000,
            'max_price_cents' => 5_000_00,
            'current_price_cents' => 5_000_00,
            'active_reservations_count' => 0,
        ]);
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'eight-drops')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations", [
                'drop_count' => 8,
            ])
            ->assertCreated()
            ->assertJsonPath('data.drop_count', 8)
            ->assertJsonPath('data.price_quoted_cents', 5_000_00)
            ->assertJsonPath('data.effective_price_cents', 40_000_00)
            ->assertJsonPath('data.price_snapshot.active_reservations_count', 8);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 8,
            'current_price_cents' => 5_000_00,
        ]);
    }

    public function test_second_supporter_lowers_current_campaign_price(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->withHeader('Idempotency-Key', 'first-supporter')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $this
            ->actingAs(User::factory()->create())
            ->withHeader('Idempotency-Key', 'second-supporter')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated()
            ->assertJsonPath('data.price_quoted_cents', 5000)
            ->assertJsonPath('data.effective_price_cents', 4000)
            ->assertJsonPath('data.price_snapshot.active_reservations_count', 2);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 2,
            'current_price_cents' => 4000,
        ]);

        $this->assertDatabaseCount('campaign_price_snapshots', 2);
    }

    public function test_reservation_creation_is_idempotent(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);
        $supporter = User::factory()->create();

        $first = $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'same-key')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'same-key')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertOk()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertDatabaseCount('reservations', 1);
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 1,
        ]);
    }

    public function test_idempotency_key_cannot_be_reused_for_different_campaign(): void
    {
        $supporter = User::factory()->create();
        $firstCampaign = Campaign::factory()->published()->create();
        $secondCampaign = Campaign::factory()->published()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'reused-key')
            ->postJson("/api/v1/campaigns/{$firstCampaign->slug}/reservations")
            ->assertCreated();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'reused-key')
            ->postJson("/api/v1/campaigns/{$secondCampaign->slug}/reservations")
            ->assertConflict();
    }

    public function test_draft_campaign_cannot_receive_reservations(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->withHeader('Idempotency-Key', 'draft-campaign')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertConflict();
    }

    public function test_idempotency_key_is_required(): void
    {
        $campaign = Campaign::factory()->published()->create();

        $this
            ->actingAs(User::factory()->create())
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertUnprocessable();
    }

    public function test_supporter_can_list_own_reservations(): void
    {
        $campaign = Campaign::factory()->published()->create();
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'mine-key')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $this
            ->actingAs($supporter)
            ->getJson('/api/v1/me/reservations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.campaign.slug', $campaign->slug);
    }

    public function test_supporter_can_cancel_own_active_reservation(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'cancel-key')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail();

        $this
            ->actingAs($supporter)
            ->deleteJson("/api/v1/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.status', ReservationStatus::Cancelled->value);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => ReservationStatus::Cancelled->value,
        ]);
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 0,
            'current_price_cents' => 5000,
        ]);
        $this->assertDatabaseHas('campaign_price_snapshots', [
            'campaign_id' => $campaign->id,
            'active_reservations_count' => 0,
            'reason' => 'reservation_cancelled',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditActions::RESERVATION_CANCELLED,
            'target_id' => $reservation->id,
        ]);
    }

    public function test_cancellation_recalculates_price_for_remaining_supporters(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);

        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first)->withHeader('Idempotency-Key', 'first')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();
        $this->actingAs($second)->withHeader('Idempotency-Key', 'second')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();

        // After 2 reservations: 8000 / 2 = 4000
        $this->assertDatabaseHas('campaigns', ['id' => $campaign->id, 'current_price_cents' => 4000]);

        $reservation = Reservation::query()->where('supporter_id', $second->id)->firstOrFail();

        $this
            ->actingAs($second)
            ->deleteJson("/api/v1/reservations/{$reservation->id}")
            ->assertOk();

        // After cancellation: 8000 / 1 = 8000, clamped to max 5000
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'active_reservations_count' => 1,
            'current_price_cents' => 5000,
        ]);
    }

    public function test_supporter_cannot_cancel_already_cancelled_reservation(): void
    {
        $campaign = Campaign::factory()->published()->create();
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'double-cancel')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail();

        $this->actingAs($supporter)->deleteJson("/api/v1/reservations/{$reservation->id}")->assertOk();
        $this->actingAs($supporter)->deleteJson("/api/v1/reservations/{$reservation->id}")->assertConflict();
    }

    public function test_supporter_cannot_cancel_another_supporters_reservation(): void
    {
        $campaign = Campaign::factory()->published()->create();
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this
            ->actingAs($owner)
            ->withHeader('Idempotency-Key', 'owner-key')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $owner->id)->firstOrFail();

        $this
            ->actingAs($other)
            ->deleteJson("/api/v1/reservations/{$reservation->id}")
            ->assertForbidden();
    }

    public function test_guest_cannot_cancel_reservation(): void
    {
        $campaign = Campaign::factory()->published()->create();
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'guest-cancel')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail();

        $this->app['auth']->forgetGuards();

        $this
            ->deleteJson("/api/v1/reservations/{$reservation->id}")
            ->assertUnauthorized();
    }

    public function test_supporter_cannot_cancel_after_campaign_reached_bloom(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'target_supporters' => 2,
            'active_reservations_count' => 0,
        ]);

        $first = User::factory()->create();
        $second = User::factory()->create();
        $third = User::factory()->create();

        $this->actingAs($first)->withHeader('Idempotency-Key', 'bloom-a')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();
        $this->actingAs($second)->withHeader('Idempotency-Key', 'bloom-b')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();
        $this->actingAs($third)->withHeader('Idempotency-Key', 'bloom-c')->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")->assertCreated();

        $campaign->refresh();
        $this->assertTrue($campaign->hasReachedBloom());

        $reservation = Reservation::query()->where('supporter_id', $first->id)->firstOrFail();

        $this
            ->actingAs($first)
            ->deleteJson("/api/v1/reservations/{$reservation->id}")
            ->assertConflict();
    }

    public function test_supporter_can_reserve_again_after_cancelling(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'active_reservations_count' => 0,
        ]);
        $supporter = User::factory()->create();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 're-reserve-1')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $reservation = Reservation::query()->where('supporter_id', $supporter->id)->firstOrFail();
        $this->actingAs($supporter)->deleteJson("/api/v1/reservations/{$reservation->id}")->assertOk();

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 're-reserve-2')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated()
            ->assertJsonPath('data.status', ReservationStatus::Active->value);

        $this->assertDatabaseCount('reservations', 1);
    }
}
