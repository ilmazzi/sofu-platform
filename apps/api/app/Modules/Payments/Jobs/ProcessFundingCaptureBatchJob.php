<?php

namespace App\Modules\Payments\Jobs;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Application\ProcessFundingCaptureBatchAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ProcessFundingCaptureBatchJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $campaignId,
    ) {}

    public function handle(ProcessFundingCaptureBatchAction $action): void
    {
        $campaign = Campaign::query()->find($this->campaignId);
        if ($campaign === null) {
            return;
        }

        $action->execute($campaign);
    }

    public function failed(?Throwable $exception): void
    {
        \Illuminate\Support\Facades\Log::warning('funding_capture_batch_job_failed', [
            'campaign_id' => $this->campaignId,
            'error' => $exception?->getMessage(),
        ]);
    }
}
