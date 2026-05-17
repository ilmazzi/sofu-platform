<?php

namespace App\Modules\Campaigns\Infrastructure\Eloquent;

use App\Models\User;
use App\Modules\Campaigns\Domain\BloomSupportersThreshold;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Domain\Enums\SofuFeeWaiverState;
use App\Modules\Campaigns\Domain\SofuPlatformFee;
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
        'video_url',
        'category',
        'status',
        'currency',
        'timezone',
        'is_commercial',
        'sofu_fee_waiver_requested',
        'sofu_fee_waiver_state',
        'sofu_fee_waiver_review_note',
        'target_supporters',
        'full_bloom_drops',
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
            'full_bloom_drops' => 'integer',
            'is_commercial' => 'boolean',
            'timezone' => 'string',
            'sofu_fee_waiver_requested' => 'boolean',
            'sofu_fee_waiver_state' => SofuFeeWaiverState::class,
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

    /** Somma voci di costo (parziale), senza commissioni. */
    public function costSubtotalCents(): int
    {
        if ($this->relationLoaded('costItems')) {
            return (int) $this->costItems->sum('amount_cents');
        }

        return (int) $this->costItems()->sum('amount_cents');
    }

    /**
     * Cuscinetto incassi: decimale da config (es. 0.10 = 10%). Vedi `config/sofu.php`.
     */
    public function paymentAttritionBuffer(): float
    {
        return (float) config('sofu.payment_attrition_buffer', 0.10);
    }

    /**
     * Soglia numerica operativa per il Bloom: target + margine (documentazione prodotto §2.3).
     */
    public function bloomSupportersThreshold(): int
    {
        return BloomSupportersThreshold::count($this->target_supporters, $this->paymentAttritionBuffer());
    }

    /**
     * Solo conteggio vs soglia (senza eccezioni di stato). Usato alla valutazione *funded* / *not funded*.
     */
    public function meetsBloomThresholdForFunding(): bool
    {
        if ($this->target_supporters <= 0) {
            return false;
        }

        return $this->active_reservations_count >= $this->bloomSupportersThreshold();
    }

    /**
     * Bloom: soglia con cuscinetto raggiunta, oppure campagna già marcata conclusa con successo.
     * Il contributo monetario si abilita solo da questo punto (promessa → pagamento).
     */
    public function hasReachedBloom(): bool
    {
        if ($this->meetsBloomThresholdForFunding()) {
            return true;
        }

        return in_array($this->status, [CampaignStatus::Successful, CampaignStatus::Closed], true);
    }

    /** Obiettivo economico oltre 5.000 € e commissione SoFu non esonerata in revisione. */
    public function appliesSofuPlatformFeeOnPayments(): bool
    {
        if ($this->costSubtotalCents() <= SofuPlatformFee::THRESHOLD_CENTS) {
            return false;
        }

        return $this->sofu_fee_waiver_state !== SofuFeeWaiverState::Approved;
    }

    /** Impedisce approvazione campagna in revisione finché l’esenzione richiesta non è stata decisa. */
    public function sofuFeeWaiverBlocksCampaignApproval(): bool
    {
        if ($this->costSubtotalCents() <= SofuPlatformFee::THRESHOLD_CENTS) {
            return false;
        }

        return $this->sofu_fee_waiver_requested
            && $this->sofu_fee_waiver_state === SofuFeeWaiverState::Pending;
    }

    /**
     * Aggiorna stato esenzione in base alla scelta del creator e al parziale voci di costo.
     *
     * @param  ?int  $previousCostSubtotalCents  null in creazione
     */
    public function applyCreatorSofuFeeWaiverChoice(bool $requested, ?int $previousCostSubtotalCents): void
    {
        $subtotal = $this->costSubtotalCents();

        if ($subtotal <= SofuPlatformFee::THRESHOLD_CENTS) {
            $this->sofu_fee_waiver_requested = false;
            $this->sofu_fee_waiver_state = SofuFeeWaiverState::NotRequested;
            $this->sofu_fee_waiver_review_note = null;

            return;
        }

        $this->sofu_fee_waiver_requested = $requested;

        if (! $requested) {
            $this->sofu_fee_waiver_state = SofuFeeWaiverState::NotRequested;
            $this->sofu_fee_waiver_review_note = null;

            return;
        }

        if ($this->sofu_fee_waiver_state === SofuFeeWaiverState::Approved) {
            if ($previousCostSubtotalCents !== null && $previousCostSubtotalCents !== $subtotal) {
                $this->sofu_fee_waiver_state = SofuFeeWaiverState::Pending;
                $this->sofu_fee_waiver_review_note = null;
            }

            return;
        }

        $this->sofu_fee_waiver_state = SofuFeeWaiverState::Pending;
        $this->sofu_fee_waiver_review_note = null;
    }
}
