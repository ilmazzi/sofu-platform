<?php

namespace App\Modules\Pricing\Infrastructure\Eloquent;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignPriceSnapshot extends Model
{
    protected $fillable = [
        'campaign_id',
        'active_reservations_count',
        'calculated_price_cents',
        'min_price_cents',
        'max_price_cents',
        'total_amount_cents',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'active_reservations_count' => 'integer',
            'calculated_price_cents' => 'integer',
            'min_price_cents' => 'integer',
            'max_price_cents' => 'integer',
            'total_amount_cents' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
