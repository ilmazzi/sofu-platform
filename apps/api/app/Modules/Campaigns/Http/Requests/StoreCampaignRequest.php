<?php

namespace App\Modules\Campaigns\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('currency')) {
            $this->merge([
                'currency' => strtoupper((string) $this->input('currency')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:500'],
            'description' => ['required', 'string', 'min:50'],
            'category' => ['nullable', 'string', 'max:80'],
            'currency' => ['required', 'string', 'size:3'],
            'target_supporters' => ['required', 'integer', 'min:1', 'max:1000000'],
            'min_price_cents' => ['required', 'integer', 'min:1', 'lt:max_price_cents'],
            'max_price_cents' => ['required', 'integer', 'min:1'],
            'cost_items' => ['required', 'array', 'min:1', 'max:100'],
            'cost_items.*.label' => ['required', 'string', 'max:160'],
            'cost_items.*.amount_cents' => ['required', 'integer', 'min:1'],
        ];
    }
}
