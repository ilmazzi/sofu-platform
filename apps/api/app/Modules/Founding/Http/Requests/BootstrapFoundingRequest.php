<?php

namespace App\Modules\Founding\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BootstrapFoundingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'surname' => ['required', 'string', 'max:80'],
            'email' => ['required', 'string', 'lowercase', 'email:rfc', 'max:255'],
        ];
    }

    public function fullName(): string
    {
        return trim((string) $this->validated('name').' '.(string) $this->validated('surname'));
    }
}
