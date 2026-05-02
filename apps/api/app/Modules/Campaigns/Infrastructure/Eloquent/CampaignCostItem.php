<?php

namespace App\Modules\Campaigns\Infrastructure\Eloquent;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignCostItem extends Model
{
    protected $fillable = [
        'campaign_id',
        'label',
        'amount_cents',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
