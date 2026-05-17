<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class BackofficeReservationSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_run_reservation_simulation_on_published_campaign(): void
    {
        Config::set('sofu.simulation_enabled', true);

        $admin = User::factory()->admin()->create();
        $campaign = Campaign::factory()->published()->create([
            'slug' => 'sim-demo',
            'target_supporters' => 25,
        ]);

        $response = $this
            ->actingAs($admin)
            ->postJson('/api/v1/backoffice/simulations/reservation-load', [
                'campaign_slug' => $campaign->slug,
                'steps' => 40,
                'cancel_probability' => 0.35,
                'stay_below_bloom' => true,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('campaign_slug', 'sim-demo');

        $created = (int) $response->json('reservations_created');
        $cancelled = (int) $response->json('reservations_cancelled');
        $this->assertGreaterThan(0, $created + $cancelled);

        $campaign->refresh();
        $this->assertFalse($campaign->hasReachedBloom());
    }

    public function test_operator_cannot_run_simulation(): void
    {
        Config::set('sofu.simulation_enabled', true);

        $campaign = Campaign::factory()->published()->create(['slug' => 'sim-op']);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->postJson('/api/v1/backoffice/simulations/reservation-load', [
                'campaign_slug' => $campaign->slug,
                'steps' => 5,
            ])
            ->assertForbidden();
    }

    public function test_simulation_returns_404_when_disabled(): void
    {
        Config::set('sofu.simulation_enabled', false);

        $campaign = Campaign::factory()->published()->create(['slug' => 'sim-off']);

        $this
            ->actingAs(User::factory()->admin()->create())
            ->postJson('/api/v1/backoffice/simulations/reservation-load', [
                'campaign_slug' => $campaign->slug,
                'steps' => 5,
            ])
            ->assertNotFound();
    }

    public function test_simulation_fails_for_non_published_campaign(): void
    {
        Config::set('sofu.simulation_enabled', true);

        $campaign = Campaign::factory()->create([
            'slug' => 'sim-draft',
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs(User::factory()->admin()->create())
            ->postJson('/api/v1/backoffice/simulations/reservation-load', [
                'campaign_slug' => $campaign->slug,
                'steps' => 5,
            ])
            ->assertStatus(422)
            ->assertJsonPath('ok', false);
    }
}
