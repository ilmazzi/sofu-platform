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
        'drop_count',
        'price_snapshot_id',
        'idempotency_key',
        'payload_hash',
        'stripe_payment_method_id',
        'payment_method_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'price_quoted_cents' => 'integer',
            'effective_price_cents' => 'integer',
            'drop_count' => 'integer',
            'payment_method_verified_at' => 'datetime',
        ];
    }

    public function dropCount(): int
    {
        return max(1, (int) ($this->drop_count ?? 1));
    }

    /** Importo da addebitare (prezzo di campagna corrente × numero drop). */
    public function paymentAmountCents(): int
    {
        $this->loadMissing('campaign');

        // After funding closes successfully, the reservation effective price is recalculated to the
        // final "bloom drop" value at closure. Use it as the source of truth for charging.
        if ($this->effective_price_cents !== null) {
            return (int) $this->effective_price_cents;
        }

        return $this->campaign->current_price_cents * $this->dropCount();
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
