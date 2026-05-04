<?php

namespace App\Modules\Campaigns\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'campaign',
            'creator_id' => (string) $this->creator_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'summary' => $this->summary,
            'description' => $this->description,
            'video_url' => $this->video_url,
            'category' => $this->category,
            'status' => $this->status->value,
            'currency' => $this->currency,
            'is_commercial' => (bool) $this->is_commercial,
            'sofu_fee_waiver_requested' => (bool) $this->sofu_fee_waiver_requested,
            'sofu_fee_waiver_state' => $this->sofu_fee_waiver_state->value,
            'sofu_fee_waiver_review_note' => $this->sofu_fee_waiver_review_note,
            'target_supporters' => $this->target_supporters,
            'full_bloom_drops' => $this->full_bloom_drops,
            'active_reservations_count' => $this->active_reservations_count,
            'min_price_cents' => $this->min_price_cents,
            'max_price_cents' => $this->max_price_cents,
            'current_price_cents' => $this->current_price_cents,
            'total_amount_cents' => $this->total_amount_cents,
            'cost_subtotal_cents' => $this->when(
                $this->relationLoaded('costItems'),
                fn () => (int) $this->costItems->sum('amount_cents'),
            ),
            'cost_items' => CampaignCostItemResource::collection($this->whenLoaded('costItems')),
            'media_urls' => $this->whenLoaded(
                'media',
                fn () => $this->media
                    ->sortBy('sort_order')
                    ->values()
                    ->map(fn ($m) => Storage::disk('public')->url($m->path))
                    ->all(),
                [],
            ),
            'published_at' => $this->published_at?->toISOString(),
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
