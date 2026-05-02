<?php

namespace App\Modules\Backoffice\Http\Requests;

class BackofficeLedgerEntryIndexRequest extends BackofficeRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'account' => ['sometimes', 'string', 'max:160'],
            'source_type' => ['sometimes', 'string', 'max:255'],
            'source_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
