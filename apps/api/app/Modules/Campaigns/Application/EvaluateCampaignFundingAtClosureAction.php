<?php

namespace App\Modules\Campaigns\Application;

use App\Modules\Campaigns\Domain\Enums\CampaignFundingOutcome;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use DateTimeInterface;
use InvalidArgumentException;

/**
 * Valuta *funded* / *not funded* al momento di chiusura (dopo la deadline, snapshot coerente).
 * Non modifica la campagna: serve a job/comandi; le transizioni di stato restano in azioni dedicate.
 */
final class EvaluateCampaignFundingAtClosureAction
{
    public function execute(Campaign $campaign, DateTimeInterface $evaluatedAt): CampaignFundingOutcome
    {
        if ($campaign->ends_at === null) {
            throw new InvalidArgumentException('Campaign must have ends_at set for funding evaluation.');
        }

        if ($evaluatedAt < $campaign->ends_at) {
            throw new InvalidArgumentException('Funding evaluation must run at or after campaign ends_at.');
        }

        if ($campaign->meetsBloomThresholdForFunding()) {
            return CampaignFundingOutcome::Funded;
        }

        return CampaignFundingOutcome::NotFunded;
    }
}
