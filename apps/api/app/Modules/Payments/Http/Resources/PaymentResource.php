<?php

namespace App\Modules\Payments\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'payment',
            'reservation_id' => (string) $this->reservation_id,
            'provider' => $this->provider,
            'provider_payment_id' => $this->provider_payment_id,
            'status' => $this->status->value,
            'amount_cents' => $this->amount_cents,
            'currency' => $this->currency,
            'provider_client_secret' => $this->client_secret,
            'failure_reason' => $this->failure_reason,
            'authorized_at' => $this->authorized_at?->toISOString(),
            'captured_at' => $this->captured_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
