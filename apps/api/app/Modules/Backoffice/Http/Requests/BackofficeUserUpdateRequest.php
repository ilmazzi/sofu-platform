<?php

namespace App\Modules\Backoffice\Http\Requests;

class BackofficeUserUpdateRequest extends BackofficeRequest
{
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:supporter,creator,operator,admin'],
        ];
    }
}
