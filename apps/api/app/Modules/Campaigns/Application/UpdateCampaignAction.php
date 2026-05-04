<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class UpdateCampaignAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     *                         Same shape as {@see CreateCampaignAction::execute()} input.
     */
    public function execute(Campaign $campaign, User $actor, array $data): Campaign
    {
        return DB::transaction(function () use ($campaign, $actor, $data): Campaign {
            $locked = Campaign::query()->whereKey($campaign->id)->lockForUpdate()->firstOrFail();

            $economics = CampaignEconomics::deriveFromTargets(
                $data['cost_items'],
                $data['target_supporters'],
                $data['full_bloom_drops'],
            );

            $days = (int) ($data['duration_days'] ?? 30);
            $days = max(1, min(730, $days));

            $locked->forceFill([
                'title' => $data['title'],
                'summary' => $data['summary'] ?? null,
                'description' => $data['description'],
                'video_url' => $data['video_url'] ?? null,
                'category' => $data['category'] ?? null,
                'currency' => $data['currency'],
                'is_commercial' => (bool) ($data['is_commercial'] ?? false),
                'target_supporters' => $data['target_supporters'],
                'full_bloom_drops' => $data['full_bloom_drops'],
                'min_price_cents' => $economics['min_price_cents'],
                'max_price_cents' => $economics['max_price_cents'],
                'total_amount_cents' => $economics['total_cents'],
                'ends_at' => now()->addDays($days),
            ]);

            if ($locked->active_reservations_count === 0) {
                $locked->current_price_cents = $economics['max_price_cents'];
            }

            $locked->save();

            $locked->costItems()->delete();
            foreach ($data['cost_items'] as $index => $item) {
                $locked->costItems()->create([
                    'label' => $item['label'],
                    'amount_cents' => $item['amount_cents'],
                    'sort_order' => $index,
                ]);
            }

            $this->audit->record(AuditActions::CAMPAIGN_UPDATED, $actor, $locked, [
                'total_amount_cents' => $locked->total_amount_cents,
            ]);

            return $locked->fresh(['costItems', 'media']);
        });
    }
}
