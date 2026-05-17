<?php

namespace App\Modules\Campaigns\Domain\Enums;

/**
 * Esito della valutazione alla chiusura raccolta impegni (fund/not fund).
 */
enum CampaignFundingOutcome: string
{
    case Funded = 'funded';
    case NotFunded = 'not_funded';
}
