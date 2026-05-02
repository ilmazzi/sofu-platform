<?php

namespace App\Modules\Backoffice\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BackofficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isBackoffice() === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
