<?php

namespace Tests\Feature;

use App\Modules\Campaigns\Application\ProcessCampaignFundingClosuresAction;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CampaignFundingClosureTest extends TestCase
{
    use RefreshDatabase;

    public function test_process_moves_published_campaign_to_successful_when_funded(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 12:00:00'));

        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 3,
            'ends_at' => Carbon::parse('2026-06-14 23:59:59'),
        ]);

        $result = app(ProcessCampaignFundingClosuresAction::class)->execute(now());

        $this->assertSame(1, $result['closed']);
        $this->assertSame(CampaignStatus::Successful, $campaign->fresh()->status);
    }

    public function test_process_moves_published_campaign_to_failed_when_not_funded(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 12:00:00'));

        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 2,
            'ends_at' => Carbon::parse('2026-06-14 23:59:59'),
        ]);

        $result = app(ProcessCampaignFundingClosuresAction::class)->execute(now());

        $this->assertSame(1, $result['closed']);
        $this->assertSame(CampaignStatus::Failed, $campaign->fresh()->status);
    }

    public function test_process_skips_campaign_before_deadline(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-14 12:00:00'));

        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 10,
            'ends_at' => Carbon::parse('2026-06-14 23:59:59'),
        ]);

        $result = app(ProcessCampaignFundingClosuresAction::class)->execute(now());

        $this->assertSame(0, $result['closed']);
        $this->assertSame(CampaignStatus::Published, $campaign->fresh()->status);
    }

    public function test_artisan_command_runs_closure_action(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 12:00:00'));

        Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 1,
            'active_reservations_count' => 2,
            'ends_at' => Carbon::parse('2026-06-13 23:59:59'),
        ]);

        $this->artisan('sofu:process-campaign-funding-closures')->assertExitCode(0);
    }
}
