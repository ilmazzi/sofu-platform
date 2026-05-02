<?php

namespace App\Modules\Backoffice\Http\Requests;

class BackofficeAuditLogIndexRequest extends BackofficeRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'action' => ['sometimes', 'string', 'max:120'],
            'actor_id' => ['sometimes', 'integer'],
            'target_type' => ['sometimes', 'string', 'max:255'],
            'target_id' => ['sometimes', 'integer'],
            'request_id' => ['sometimes', 'string', 'max:80'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
