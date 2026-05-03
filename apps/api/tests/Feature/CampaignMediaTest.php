<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CampaignMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_creator_can_upload_images_for_draft_campaign(): void
    {
        Storage::fake('public');

        $user = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $user->id,
            'status' => CampaignStatus::Draft,
        ]);

        $response = $this->actingAs($user)->post("/api/v1/campaigns/{$campaign->slug}/media", [
            'images' => [
                UploadedFile::fake()->image('a.jpg'),
                UploadedFile::fake()->image('b.png'),
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data.media_urls');

        $this->assertDatabaseCount('campaign_media', 2);
    }

    public function test_guest_cannot_upload_campaign_media(): void
    {
        Storage::fake('public');
        $campaign = Campaign::factory()->create(['status' => CampaignStatus::Draft]);

        $this
            ->withHeaders([
                'Accept' => 'application/json',
                'X-Requested-With' => 'XMLHttpRequest',
            ])
            ->post("/api/v1/campaigns/{$campaign->slug}/media", [
                'images' => [UploadedFile::fake()->image('a.jpg')],
            ])
            ->assertUnauthorized();
    }

    public function test_non_owner_cannot_upload_campaign_media(): void
    {
        Storage::fake('public');

        $campaign = Campaign::factory()->create(['status' => CampaignStatus::Draft]);
        $other = User::factory()->creator()->create();

        $this
            ->actingAs($other)
            ->post("/api/v1/campaigns/{$campaign->slug}/media", [
                'images' => [UploadedFile::fake()->image('a.jpg')],
            ])
            ->assertForbidden();
    }

    public function test_creator_cannot_upload_media_when_campaign_is_published(): void
    {
        Storage::fake('public');

        $user = User::factory()->creator()->create();
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => $user->id,
        ]);

        $this
            ->actingAs($user)
            ->post("/api/v1/campaigns/{$campaign->slug}/media", [
                'images' => [UploadedFile::fake()->image('a.jpg')],
            ])
            ->assertForbidden();
    }
}
