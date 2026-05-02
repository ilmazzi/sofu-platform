<?php

namespace App\Modules\Ledger\Domain;

class LedgerAccounts
{
    public const PLATFORM_CASH = 'platform:cash';

    public const PROVIDER_FEES = 'provider:fees';

    public const SOFU_REVENUE = 'sofu:revenue';

    public static function creatorPayable(int|string $creatorId): string
    {
        return "creator:{$creatorId}:payable";
    }
}
