<?php

namespace App\Modules\Campaigns\Application;

use App\Modules\Campaigns\Domain\Enums\CampaignFundingOutcome;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Jobs\ProcessFundingCaptureBatchJob;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Trova campagne in raccolta la cui deadline è passata e applica l’esito *funded* / *not funded*
 * (transizione a successful / failed). Idempotente: campagne già terminali non sono selezionate.
 */
final class ProcessCampaignFundingClosuresAction
{
    public function __construct(
        private readonly EvaluateCampaignFundingAtClosureAction $evaluateFunding,
        private readonly TransitionCampaignStatusAction $transitionStatus,
    ) {}

    /**
     * @return array{closed: int, skipped: int, errors: list<array{campaign_id: int, message: string}>}
     */
    public function execute(DateTimeInterface $now): array
    {
        $closed = 0;
        $skipped = 0;
        $errors = [];

        $query = Campaign::query()
            ->whereIn('status', [CampaignStatus::Published, CampaignStatus::Activated])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', $now)
            ->orderBy('id');

        foreach ($query->lazyById(100) as $campaign) {
            try {
                $didClose = DB::transaction(function () use ($campaign, $now): bool {
                    $locked = Campaign::query()
                        ->whereKey($campaign->id)
                        ->lockForUpdate()
                        ->first();

                    if ($locked === null) {
                        return false;
                    }

                    if (! $this->isEligibleForFundingClosure($locked, $now)) {
                        return false;
                    }

                    $outcome = $this->evaluateFunding->execute($locked, $now);
                    $to = $outcome === CampaignFundingOutcome::Funded
                        ? CampaignStatus::Successful
                        : CampaignStatus::Failed;

                    $after = $this->transitionStatus->execute($locked, $to, null);

                    if ($to === CampaignStatus::Successful) {
                        ProcessFundingCaptureBatchJob::dispatch($after->id)->afterCommit();
                    }

                    return true;
                });

                if ($didClose) {
                    $closed++;
                } else {
                    $skipped++;
                }
            } catch (Throwable $e) {
                Log::warning('campaign_funding_closure_failed', [
                    'campaign_id' => $campaign->id,
                    'error' => $e->getMessage(),
                ]);
                $errors[] = [
                    'campaign_id' => (int) $campaign->id,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return [
            'closed' => $closed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    private function isEligibleForFundingClosure(Campaign $campaign, DateTimeInterface $now): bool
    {
        if (! in_array($campaign->status, [CampaignStatus::Published, CampaignStatus::Activated], true)) {
            return false;
        }

        if ($campaign->ends_at === null) {
            return false;
        }

        return $campaign->ends_at <= $now;
    }
}
