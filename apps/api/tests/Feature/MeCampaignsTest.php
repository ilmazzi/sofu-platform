<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeCampaignsTest extends TestCase
{
    use RefreshDatabase;

    public function test_creator_lists_only_own_campaigns_in_any_status(): void
    {
        $creator = User::factory()->creator()->create();
        $other = User::factory()->creator()->create();

        $mine = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::Draft,
            'title' => 'My draft',
        ]);
        $mine->costItems()->create([
            'label' => 'A',
            'amount_cents' => 10_000,
            'sort_order' => 0,
        ]);

        Campaign::factory()->create([
            'creator_id' => $other->id,
            'status' => CampaignStatus::Published,
            'title' => 'Not mine',
        ]);

        $response = $this
            ->actingAs($creator)
            ->getJson('/api/v1/me/campaigns');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', $mine->slug)
            ->assertJsonPath('data.0.status', CampaignStatus::Draft->value);
    }

    public function test_supporter_sees_empty_my_campaigns_list(): void
    {
        $user = User::factory()->create();

        $this
            ->actingAs($user)
            ->getJson('/api/v1/me/campaigns')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
