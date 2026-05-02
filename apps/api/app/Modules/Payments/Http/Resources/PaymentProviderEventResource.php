<?php

namespace App\Modules\Payments\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentProviderEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'payment_provider_event',
            'provider' => $this->provider,
            'provider_event_id' => $this->provider_event_id,
            'event_type' => $this->event_type,
            'processed_at' => $this->processed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
