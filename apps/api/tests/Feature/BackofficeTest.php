<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditActions;
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

        app(AuditLogger::class)->record(AuditActions::CAMPAIGN_SUBMITTED_FOR_REVIEW, $creator, $campaign, [
            'from' => 'draft',
            'to' => 'submitted_for_review',
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/campaigns/'.$campaign->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', 'operational-detail')
            ->assertJsonPath('data.creator.email', $creator->email)
            ->assertJsonPath('data.audit_logs.0.action', AuditActions::CAMPAIGN_SUBMITTED_FOR_REVIEW);
    }

    public function test_operator_dashboard_stats_use_domain_enums(): void
    {
        Campaign::factory()->create(['status' => CampaignStatus::SubmittedForReview]);
        Campaign::factory()->create(['status' => CampaignStatus::Published]);

        $campaign = Campaign::factory()->published()->create();
        $supporter = User::factory()->create();
        Reservation::query()->create([
            'campaign_id' => $campaign->id,
            'supporter_id' => $supporter->id,
            'status' => ReservationStatus::ConvertedToPayment,
            'price_quoted_cents' => 1000,
            'effective_price_cents' => 950,
            'idempotency_key' => 'stats-test-1',
            'payload_hash' => hash('sha256', 'stats-test'),
        ]);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/stats')
            ->assertOk()
            ->assertJsonPath('campaigns_in_review', 1)
            ->assertJsonPath('campaigns_published', 2) // one standalone published + reservation campaign
            ->assertJsonPath('total_revenue_cents', 950);
    }

    public function test_operator_can_filter_audit_logs(): void
    {
        $creator = User::factory()->creator()->create();
        $campaign = Campaign::factory()->create(['creator_id' => $creator->id]);

        app(AuditLogger::class)->record(AuditActions::CAMPAIGN_CREATED, $creator, $campaign);
        app(AuditLogger::class)->record(AuditActions::IDENTITY_LOGGED_IN, $creator, $creator);

        $this
            ->actingAs(User::factory()->operator()->create())
            ->getJson('/api/v1/backoffice/audit-logs?action='.urlencode(AuditActions::CAMPAIGN_CREATED))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', AuditActions::CAMPAIGN_CREATED)
            ->assertJsonPath('data.0.target_id', (string) $campaign->id);
    }
}
