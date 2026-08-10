<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FoundingFlowTest extends TestCase
{
    use RefreshDatabase;

    private function seedFoundingCampaign(): Campaign
    {
        $creator = User::factory()->create(['role' => 'creator']);

        return Campaign::factory()->published()->create([
            'creator_id' => $creator->id,
            'slug' => 'sofu-founding',
            'title' => 'Sostieni SoFu',
            'status' => CampaignStatus::Published,
            'target_supporters' => 28,
            'full_bloom_drops' => 140_001,
            'min_price_cents' => 100,
            'max_price_cents' => 500_000,
            'current_price_cents' => 500_000,
            'total_amount_cents' => 14_000_000,
            'active_reservations_count' => 0,
        ]);
    }

    public function test_bootstrap_creates_user_and_logs_in(): void
    {
        $this->seedFoundingCampaign();

        $this
            ->postJson('/api/v1/founding/bootstrap', [
                'name' => 'Nuovo',
                'surname' => 'Sostenitore',
                'email' => 'nuovo@sofu.test',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'nuovo@sofu.test')
            ->assertJsonPath('data.name', 'Nuovo Sostenitore')
            ->assertJsonPath('meta.created', true);

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'nuovo@sofu.test',
            'role' => 'supporter',
        ]);
    }

    public function test_bootstrap_conflicts_when_email_exists(): void
    {
        $this->seedFoundingCampaign();
        User::factory()->create([
            'email' => 'exists@sofu.test',
            'password' => Hash::make('password'),
        ]);

        $this
            ->postJson('/api/v1/founding/bootstrap', [
                'name' => 'Altro',
                'surname' => 'Utente',
                'email' => 'exists@sofu.test',
            ])
            ->assertConflict();
    }

    public function test_mock_setup_intent_and_pledge_creates_verified_reservation(): void
    {
        config(['payments.driver' => 'mock']);
        $this->seedFoundingCampaign();
        $user = User::factory()->create();

        $setup = $this
            ->actingAs($user)
            ->postJson('/api/v1/founding/setup-intent')
            ->assertCreated()
            ->json('data');

        $this->assertSame('mock', $setup['provider']);
        $this->assertNotEmpty($setup['setup_intent_id']);
        $this->assertNotEmpty($setup['client_secret']);

        $this
            ->actingAs($user)
            ->withHeader('Idempotency-Key', 'founding-pledge-1')
            ->postJson('/api/v1/founding/pledge', [
                'drop_count' => 2,
                'setup_intent_id' => $setup['setup_intent_id'],
                'idempotency_key' => 'founding-pledge-1',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', ReservationStatus::Active->value)
            ->assertJsonPath('data.drop_count', 2)
            ->assertJsonPath('data.payment_method_verified_at', fn ($v) => is_string($v) && $v !== '');

        $this
            ->actingAs($user)
            ->getJson('/api/v1/founding/my-reservation')
            ->assertOk()
            ->assertJsonPath('data.drop_count', 2);
    }

    public function test_public_founding_campaign_endpoint(): void
    {
        $this->seedFoundingCampaign();

        $this
            ->getJson('/api/v1/founding/campaign')
            ->assertOk()
            ->assertJsonPath('data.slug', 'sofu-founding')
            ->assertJsonPath('data.max_price_cents', 500_000);
    }
}
