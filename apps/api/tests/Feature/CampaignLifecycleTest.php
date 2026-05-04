<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Domain\Enums\SofuFeeWaiverState;
use App\Modules\Campaigns\Domain\SofuPlatformFee;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_creator_can_submit_own_draft_for_review(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs($creator)
            ->postJson("/api/v1/campaigns/{$campaign->slug}/submit-for-review")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::SubmittedForReview->value);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'status' => CampaignStatus::SubmittedForReview->value,
        ]);
    }

    public function test_non_owner_cannot_submit_campaign_for_review(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs(User::factory()->creator()->create())
            ->postJson("/api/v1/campaigns/{$campaign->slug}/submit-for-review")
            ->assertForbidden();
    }

    public function test_operator_can_approve_submitted_campaign(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Approved->value);
    }

    public function test_operator_cannot_approve_while_sofu_fee_waiver_pending(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::SubmittedForReview,
            'sofu_fee_waiver_requested' => true,
            'sofu_fee_waiver_state' => SofuFeeWaiverState::Pending,
        ]);
        $campaign->costItems()->create([
            'label' => 'Obiettivo',
            'amount_cents' => SofuPlatformFee::THRESHOLD_CENTS + 1000,
            'sort_order' => 0,
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/approve")
            ->assertUnprocessable();
    }

    public function test_operator_can_decide_sofu_fee_waiver_then_approve(): void
    {
        $operator = User::factory()->operator()->create();
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::SubmittedForReview,
            'sofu_fee_waiver_requested' => true,
            'sofu_fee_waiver_state' => SofuFeeWaiverState::Pending,
        ]);
        $campaign->costItems()->create([
            'label' => 'Obiettivo',
            'amount_cents' => SofuPlatformFee::THRESHOLD_CENTS + 1000,
            'sort_order' => 0,
        ]);

        $this
            ->actingAs($operator)
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/sofu-fee-waiver", [
                'decision' => 'approve',
            ])
            ->assertOk()
            ->assertJsonPath('data.sofu_fee_waiver_state', SofuFeeWaiverState::Approved->value);

        $this
            ->actingAs($operator)
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Approved->value);
    }

    public function test_supporter_cannot_approve_campaign(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/approve")
            ->assertForbidden();
    }

    public function test_operator_can_reject_submitted_campaign(): void
    {
        $campaign = Campaign::factory()->create([
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Rejected->value);
    }

    public function test_creator_can_withdraw_submitted_campaign_to_draft(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs($creator)
            ->postJson("/api/v1/campaigns/{$campaign->slug}/withdraw-review")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Draft->value);
    }

    public function test_creator_can_publish_approved_campaign(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::Approved,
            'published_at' => null,
        ]);

        $this
            ->actingAs($creator)
            ->postJson("/api/v1/campaigns/{$campaign->slug}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Published->value);

        $this->assertNotNull($campaign->fresh()->published_at);
    }

    public function test_creator_cannot_publish_unapproved_campaign(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs($creator)
            ->postJson("/api/v1/campaigns/{$campaign->slug}/publish")
            ->assertForbidden();
    }
}
