<?php

namespace Tests\Feature;

use App\Modules\Campaigns\Application\EvaluateCampaignFundingAtClosureAction;
use App\Modules\Campaigns\Domain\Enums\CampaignFundingOutcome;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignFundingEvaluationTest extends TestCase
{
    use RefreshDatabase;

    public function test_funded_when_threshold_met_after_deadline(): void
    {
        $ends = now()->subHour();
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 3,
            'ends_at' => $ends,
        ]);

        $outcome = app(EvaluateCampaignFundingAtClosureAction::class)
            ->execute($campaign, now());

        $this->assertSame(CampaignFundingOutcome::Funded, $outcome);
    }

    public function test_not_funded_when_below_threshold(): void
    {
        $ends = now()->subHour();
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 2,
            'ends_at' => $ends,
        ]);

        $outcome = app(EvaluateCampaignFundingAtClosureAction::class)
            ->execute($campaign, now());

        $this->assertSame(CampaignFundingOutcome::NotFunded, $outcome);
    }

    public function test_evaluation_before_ends_at_throws(): void
    {
        $ends = now()->addHour();
        $campaign = Campaign::factory()->published()->create([
            'creator_id' => User::factory()->create()->id,
            'target_supporters' => 2,
            'active_reservations_count' => 3,
            'ends_at' => $ends,
        ]);

        $this->expectException(\InvalidArgumentException::class);

        app(EvaluateCampaignFundingAtClosureAction::class)->execute($campaign, now());
    }
}
