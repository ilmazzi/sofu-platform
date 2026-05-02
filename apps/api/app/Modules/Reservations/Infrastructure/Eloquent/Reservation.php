<?php

namespace App\Modules\Reservations\Infrastructure\Eloquent;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Modules\Pricing\Infrastructure\Eloquent\CampaignPriceSnapshot;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    protected $fillable = [
        'campaign_id',
        'supporter_id',
        'status',
        'price_quoted_cents',
        'effective_price_cents',
        'price_snapshot_id',
        'idempotency_key',
        'payload_hash',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'price_quoted_cents' => 'integer',
            'effective_price_cents' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function supporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supporter_id');
    }

    public function priceSnapshot(): BelongsTo
    {
        return $this->belongsTo(CampaignPriceSnapshot::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
