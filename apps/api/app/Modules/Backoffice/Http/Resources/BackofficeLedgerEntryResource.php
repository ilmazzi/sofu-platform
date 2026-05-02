<?php

namespace App\Modules\Backoffice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BackofficeLedgerEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'ledger_entry',
            'account' => $this->account,
            'direction' => $this->direction->value,
            'amount_cents' => $this->amount_cents,
            'currency' => $this->currency,
            'source_type' => $this->source_type,
            'source_id' => $this->source_id ? (string) $this->source_id : null,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
