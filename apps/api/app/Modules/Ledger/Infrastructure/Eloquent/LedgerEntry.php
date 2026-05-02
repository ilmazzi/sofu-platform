<?php

namespace App\Modules\Ledger\Infrastructure\Eloquent;

use App\Modules\Ledger\Domain\Enums\LedgerEntryDirection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LedgerEntry extends Model
{
    protected $fillable = [
        'account',
        'direction',
        'amount_cents',
        'currency',
        'source_type',
        'source_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'direction' => LedgerEntryDirection::class,
            'amount_cents' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
