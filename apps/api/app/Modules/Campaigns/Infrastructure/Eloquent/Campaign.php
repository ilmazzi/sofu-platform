<?php

namespace App\Modules\Campaigns\Infrastructure\Eloquent;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Pricing\Infrastructure\Eloquent\CampaignPriceSnapshot;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\Audit\AuditLog;
use Database\Factories\CampaignFactory;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[UseFactory(CampaignFactory::class)]
class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'creator_id',
        'title',
        'slug',
        'summary',
        'description',
        'category',
        'status',
        'currency',
        'target_supporters',
        'active_reservations_count',
        'min_price_cents',
        'max_price_cents',
        'current_price_cents',
        'total_amount_cents',
        'published_at',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => CampaignStatus::class,
            'target_supporters' => 'integer',
            'active_reservations_count' => 'integer',
            'min_price_cents' => 'integer',
            'max_price_cents' => 'integer',
            'current_price_cents' => 'integer',
            'total_amount_cents' => 'integer',
            'published_at' => 'datetime',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function costItems(): HasMany
    {
        return $this->hasMany(CampaignCostItem::class)->orderBy('sort_order');
    }

    public function media(): HasMany
    {
        return $this->hasMany(CampaignMedia::class)->orderBy('sort_order');
    }

    public function priceSnapshots(): HasMany
    {
        return $this->hasMany(CampaignPriceSnapshot::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'target_id')
            ->where('target_type', $this->getMorphClass())
            ->latest();
    }
}
