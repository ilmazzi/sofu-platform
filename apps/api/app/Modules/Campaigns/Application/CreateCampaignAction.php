<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateCampaignAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array{
     *     title: string,
     *     summary?: string|null,
     *     description: string,
     *     video_url?: string|null,
     *     category?: string|null,
     *     currency: string,
     *     is_commercial?: bool,
     *     target_supporters: int,
     *     full_bloom_drops: int,
     *     duration_days?: int|null,
     *     cost_items: array<int, array{label: string, amount_cents: int}>
     * }  $data
     */
    public function execute(User $creator, array $data): Campaign
    {
        return DB::transaction(function () use ($creator, $data): Campaign {
            $economics = CampaignEconomics::deriveFromTargets(
                $data['cost_items'],
                $data['target_supporters'],
                $data['full_bloom_drops'],
            );

            $days = (int) ($data['duration_days'] ?? 30);
            $days = max(1, min(730, $days));

            $campaign = Campaign::create([
                'creator_id' => $creator->id,
                'title' => $data['title'],
                'slug' => $this->uniqueSlug($data['title']),
                'summary' => $data['summary'] ?? null,
                'description' => $data['description'],
                'video_url' => $data['video_url'] ?? null,
                'category' => $data['category'] ?? null,
                'status' => CampaignStatus::Draft,
                'currency' => $data['currency'],
                'is_commercial' => (bool) ($data['is_commercial'] ?? false),
                'target_supporters' => $data['target_supporters'],
                'full_bloom_drops' => $data['full_bloom_drops'],
                'min_price_cents' => $economics['min_price_cents'],
                'max_price_cents' => $economics['max_price_cents'],
                'current_price_cents' => $economics['max_price_cents'],
                'total_amount_cents' => $economics['total_cents'],
                'published_at' => null,
                'starts_at' => null,
                'ends_at' => now()->addDays($days),
            ]);

            foreach ($data['cost_items'] as $index => $item) {
                $campaign->costItems()->create([
                    'label' => $item['label'],
                    'amount_cents' => $item['amount_cents'],
                    'sort_order' => $index,
                ]);
            }

            $this->audit->record(AuditActions::CAMPAIGN_CREATED, $creator, $campaign, [
                'status' => CampaignStatus::Draft->value,
                'total_amount_cents' => $campaign->total_amount_cents,
                'currency' => $campaign->currency,
            ]);

            return $campaign->load(['costItems', 'media']);
        });
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: Str::lower((string) Str::ulid());
        $slug = $base;
        $attempt = 2;

        while (Campaign::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$attempt}";
            $attempt++;
        }

        return $slug;
    }
}
