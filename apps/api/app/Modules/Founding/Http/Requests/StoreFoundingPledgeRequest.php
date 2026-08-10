<?php

namespace App\Modules\Founding\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFoundingPledgeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'drop_count' => ['required', 'integer', 'min:1', 'max:10000'],
            'setup_intent_id' => ['required', 'string', 'max:255'],
            'idempotency_key' => ['required', 'string', 'max:160'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validationData(): array
    {
        $data = parent::validationData();
        $headerKey = $this->header('Idempotency-Key');
        if (is_string($headerKey) && $headerKey !== '' && ! isset($data['idempotency_key'])) {
            $data['idempotency_key'] = $headerKey;
        }

        return $data;
    }
}
