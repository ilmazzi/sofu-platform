<?php

namespace App\Modules\Campaigns\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignCostItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'campaign_cost_item',
            'label' => $this->label,
            'amount_cents' => $this->amount_cents,
            'sort_order' => $this->sort_order,
        ];
    }
}
