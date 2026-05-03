<?php

namespace App\Modules\Backoffice\Http\Requests;

class BackofficeUserIndexRequest extends BackofficeRequest
{
    public function rules(): array
    {
        return [
            'role' => ['sometimes', 'string', 'in:supporter,creator,operator,admin'],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
