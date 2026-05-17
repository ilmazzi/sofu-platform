<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_campaign_draft(): void
    {
        $user = User::factory()->creator()->create();

        $response = $this
            ->actingAs($user)
            ->postJson('/api/v1/campaigns', [
                'title' => 'Laboratorio solare di quartiere',
                'summary' => 'Un laboratorio condiviso per imparare energia solare.',
                'description' => str_repeat('Descrizione del progetto reale con obiettivi e benefici. ', 2),
                'category' => 'education',
                'currency' => 'eur',
                'target_supporters' => 120,
                'full_bloom_drops' => 400,
                'duration_days' => 45,
                'cost_items' => [
                    ['label' => 'Materiali', 'amount_cents' => 180000],
                    ['label' => 'Docenti', 'amount_cents' => 240000],
                    ['label' => 'Guadagno', 'amount_cents' => 0],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.type', 'campaign')
            ->assertJsonPath('data.status', CampaignStatus::Draft->value)
            ->assertJsonPath('data.currency', 'EUR')
            ->assertJsonPath('data.current_price_cents', 3588)
            ->assertJsonPath('data.min_price_cents', 1076)
            ->assertJsonPath('data.total_amount_cents', 430500)
            ->assertJsonPath('data.cost_subtotal_cents', 420000)
            ->assertJsonCount(3, 'data.cost_items')
            ->assertJsonPath('data.cost_items.2.label', 'Guadagno')
            ->assertJsonPath('data.cost_items.2.amount_cents', 0)
            ->assertJsonPath('data.media_urls', []);

        $this->assertDatabaseHas('campaigns', [
            'creator_id' => $user->id,
            'status' => CampaignStatus::Draft->value,
            'total_amount_cents' => 430500,
        ]);

        $this->assertDatabaseHas('campaign_cost_items', [
            'label' => 'Materiali',
            'amount_cents' => 180000,
        ]);
    }

    public function test_guest_cannot_create_campaign(): void
    {
        $this
            ->postJson('/api/v1/campaigns', [])
            ->assertUnauthorized();
    }

    public function test_published_campaign_can_be_shown_by_slug(): void
    {
        $campaign = Campaign::factory()->published()->create([
            'title' => 'Biblioteca condivisa',
            'slug' => 'biblioteca-condivisa',
        ]);

        $this
            ->getJson('/api/v1/campaigns/'.$campaign->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', 'biblioteca-condivisa')
            ->assertJsonPath('data.title', 'Biblioteca condivisa');
    }

    public function test_public_index_only_lists_public_campaigns(): void
    {
        Campaign::factory()->create(['title' => 'Bozza privata']);
        Campaign::factory()->published()->create(['title' => 'Campagna pubblica']);

        $this
            ->getJson('/api/v1/campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Campagna pubblica');
    }

    public function test_guest_cannot_view_draft_campaign(): void
    {
        $campaign = Campaign::factory()->create(['slug' => 'bozza-privata']);

        $this
            ->getJson('/api/v1/campaigns/'.$campaign->slug)
            ->assertForbidden();
    }

    public function test_creator_can_view_own_draft_campaign(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'slug' => 'mia-bozza',
        ]);

        $this
            ->actingAs($creator)
            ->getJson('/api/v1/campaigns/'.$campaign->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', 'mia-bozza');
    }

    public function test_create_campaign_appends_guadagno_when_missing(): void
    {
        $user = User::factory()->creator()->create();

        $this
            ->actingAs($user)
            ->postJson('/api/v1/campaigns', [
                'title' => 'Progetto senza guadagno esplicito',
                'description' => str_repeat('Descrizione valida per la campagna di test. ', 2),
                'currency' => 'EUR',
                'target_supporters' => 50,
                'full_bloom_drops' => 200,
                'duration_days' => 30,
                'cost_items' => [
                    ['label' => 'Attrezzatura', 'amount_cents' => 50_000],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.cost_items.1.label', 'Guadagno')
            ->assertJsonPath('data.cost_items.1.amount_cents', 0);

        $this->assertDatabaseHas('campaign_cost_items', [
            'label' => 'Guadagno',
            'amount_cents' => 0,
        ]);
    }

    public function test_create_campaign_rejects_only_zero_costs(): void
    {
        $user = User::factory()->creator()->create();

        $this
            ->actingAs($user)
            ->postJson('/api/v1/campaigns', [
                'title' => 'Solo guadagno zero',
                'description' => str_repeat('Descrizione valida per la campagna di test. ', 2),
                'currency' => 'EUR',
                'target_supporters' => 50,
                'full_bloom_drops' => 200,
                'duration_days' => 30,
                'cost_items' => [
                    ['label' => 'Guadagno', 'amount_cents' => 0],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cost_items']);
    }
}
