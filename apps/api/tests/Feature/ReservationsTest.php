<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
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
}
