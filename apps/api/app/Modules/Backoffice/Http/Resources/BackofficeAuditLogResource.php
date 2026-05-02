<?php

namespace App\Modules\Backoffice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BackofficeAuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => 'audit_log',
            'action' => $this->action,
            'actor_type' => $this->actor_type,
            'actor_id' => $this->actor_id ? (string) $this->actor_id : null,
            'target_type' => $this->target_type,
            'target_id' => $this->target_id ? (string) $this->target_id : null,
            'request_id' => $this->request_id,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
