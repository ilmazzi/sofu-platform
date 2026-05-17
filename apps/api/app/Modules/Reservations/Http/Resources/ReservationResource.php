<?php

namespace App\Modules\Reservations\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'reservation',
            'campaign_id' => (string) $this->campaign_id,
            'supporter_id' => (string) $this->supporter_id,
            'status' => $this->status->value,
            'price_quoted_cents' => $this->price_quoted_cents,
            'effective_price_cents' => $this->effective_price_cents,
            'drop_count' => $this->dropCount(),
            'price_snapshot_id' => $this->price_snapshot_id ? (string) $this->price_snapshot_id : null,
            'campaign' => $this->whenLoaded('campaign', fn () => [
                'id' => (string) $this->campaign->id,
                'type' => 'campaign',
                'title' => $this->campaign->title,
                'slug' => $this->campaign->slug,
                'status' => $this->campaign->status->value,
                'target_supporters' => $this->campaign->target_supporters,
                'current_price_cents' => $this->campaign->current_price_cents,
                'active_reservations_count' => $this->campaign->active_reservations_count,
                'currency' => $this->campaign->currency,
            ]),
            'price_snapshot' => $this->whenLoaded('priceSnapshot', fn () => [
                'id' => (string) $this->priceSnapshot->id,
                'type' => 'campaign_price_snapshot',
                'active_reservations_count' => $this->priceSnapshot->active_reservations_count,
                'calculated_price_cents' => $this->priceSnapshot->calculated_price_cents,
                'reason' => $this->priceSnapshot->reason,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
