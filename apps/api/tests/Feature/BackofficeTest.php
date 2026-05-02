<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackofficeTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_backoffice(): void
    {
        $this
            ->getJson('/api/v1/backoffice/campaigns')
            ->assertUnauthorized();
    }

    public function test_supporter_cannot_access_backoffice(): void
    {
        $this
            ->actingAs(User::factory()->create())
            ->getJson('/api/v1/backoffice/campaigns')
            ->assertForbidden();
    }

    public function test_operator_can_list_campaigns_with_filters(): void
    {
        Campaign::factory()->create([
            'title' => 'Bozza interna',
            'status' => CampaignStatus::Draft,
        ]);
        Campaign::factory()->create([
            'title' => 'Pronta per review',
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/campaigns?status=submitted_for_review&q=Pronta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Pronta per review')
            ->assertJsonPath('data.0.status', CampaignStatus::SubmittedForReview->value);
    }

    public function test_operator_can_list_campaigns_in_review(): void
    {
        Campaign::factory()->create(['status' => CampaignStatus::Draft]);
        Campaign::factory()->create([
            'title' => 'Review me',
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/campaigns/in-review')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Review me');
    }

    public function test_operator_can_view_campaign_operational_detail_with_audit_logs(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'slug' => 'operational-detail',
            'status' => CampaignStatus::SubmittedForReview,
        ]);

        app(AuditLogger::class)->record('campaign.submitted_for_review', $creator, $campaign, [
            'from' => 'draft',
            'to' => 'submitted_for_review',
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/campaigns/'.$campaign->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', 'operational-detail')
            ->assertJsonPath('data.creator.email', $creator->email)
            ->assertJsonPath('data.audit_logs.0.action', 'campaign.submitted_for_review');
    }

    public function test_operator_can_filter_audit_logs(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create(['creator_id' => $creator->id]);

        app(AuditLogger::class)->record('campaign.created', $creator, $campaign);
        app(AuditLogger::class)->record('identity.logged_in', $creator, $creator);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/audit-logs?action=campaign.created')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'campaign.created')
            ->assertJsonPath('data.0.target_id', (string) $campaign->id);
    }
}
