<?php

namespace App\Modules\Campaigns\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCampaignRequest extends FormRequest
{
    public const CATEGORY_VALUES = [
        'tech', 'art', 'music', 'film', 'games', 'food', 'fashion', 'design', 'publishing',
        'education', 'environment', 'health', 'community',
    ];

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if (! $this->has('currency') || $this->input('currency') === null || $this->input('currency') === '') {
            $merge['currency'] = 'EUR';
        } else {
            $merge['currency'] = strtoupper((string) $this->input('currency'));
        }
        if ($this->has('category') && $this->input('category') === '') {
            $merge['category'] = null;
        }
        if ($this->has('video_url') && is_string($this->input('video_url')) && trim($this->input('video_url')) === '') {
            $merge['video_url'] = null;
        }
        $this->merge($merge);
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
            'video_url' => ['nullable', 'string', 'max:2048', 'url'],
            'category' => ['nullable', 'string', 'max:80', Rule::in(self::CATEGORY_VALUES)],
            'currency' => ['required', 'string', 'size:3'],
            'is_commercial' => ['sometimes', 'boolean'],
            'sofu_fee_waiver_requested' => ['sometimes', 'boolean'],
            'target_supporters' => ['required', 'integer', 'min:1', 'max:1000000'],
            'full_bloom_drops' => ['required', 'integer', 'min:1', 'max:10000000'],
            'duration_days' => ['nullable', 'integer', 'min:1', 'max:730'],
            'cost_items' => ['required', 'array', 'min:1', 'max:100'],
            'cost_items.*.label' => ['required', 'string', 'max:160'],
            'cost_items.*.amount_cents' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var array<int, array{label: string, amount_cents: int}> $items */
            $items = $this->input('cost_items', []);
            $total = 0;
            foreach ($items as $item) {
                $total += (int) ($item['amount_cents'] ?? 0);
            }

            $n = (int) $this->input('target_supporters');
            $m = (int) $this->input('full_bloom_drops');

            if ($m < $n) {
                $validator->errors()->add(
                    'full_bloom_drops',
                    'Le blooming drops (tetto) devono essere maggiori o uguali alle growing drops (soglia Bloom).',
                );
            }

            if ($total <= 0 || $n < 1 || $validator->errors()->isNotEmpty()) {
                return;
            }

            $min = max(1, (int) round($total / $m));
            $max = (int) ceil($total / $n);

            if ($max <= $min) {
                $validator->errors()->add(
                    'full_bloom_drops',
                    'Regola growing drops e tetto blooming drops: l’offerta di partenza deve restare maggiore del minimo.',
                );
            }
        });
    }
}
