<?php

namespace App\Modules\Payments\Infrastructure\Eloquent;

use App\Modules\Ledger\Infrastructure\Eloquent\LedgerEntry;
use App\Modules\Payments\Domain\Enums\PaymentStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Payment extends Model
{
    protected $fillable = [
        'reservation_id',
        'provider',
        'provider_payment_id',
        'status',
        'amount_cents',
        'currency',
        'client_secret',
        'failure_reason',
        'authorized_at',
        'captured_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'amount_cents' => 'integer',
            'authorized_at' => 'datetime',
            'captured_at' => 'datetime',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function ledgerEntries(): MorphMany
    {
        return $this->morphMany(LedgerEntry::class, 'source');
    }
}
