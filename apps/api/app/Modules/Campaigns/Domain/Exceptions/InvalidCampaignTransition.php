<?php

namespace App\Modules\Campaigns\Domain\Exceptions;

use DomainException;

class InvalidCampaignTransition extends DomainException
{
    public static function fromTo(string $from, string $to): self
    {
        return new self("Campaign cannot transition from {$from} to {$to}.");
    }
}
