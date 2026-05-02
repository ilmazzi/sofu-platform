<?php

namespace App\Modules\Ledger\Domain\Enums;

enum LedgerEntryDirection: string
{
    case Credit = 'credit';
    case Debit = 'debit';
}
