<?php

namespace App\Modules\Campaigns\Http\Requests;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreCampaignMediaRequest extends FormRequest
{
    private const int MAX_PER_CAMPAIGN = 12;

    private const int MAX_PER_REQUEST = 10;

    public function authorize(): bool
    {
        $campaign = $this->route('campaign');
        if (! $campaign instanceof Campaign || $this->user() === null) {
            return false;
        }

        Gate::authorize('uploadMedia', $campaign);

        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->hasFile('images')) {
            return;
        }

        $images = $this->file('images');
        if (! is_array($images)) {
            $this->merge(['images' => [$images]]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Campaign $campaign */
        $campaign = $this->route('campaign');
        $remaining = max(0, self::MAX_PER_CAMPAIGN - $campaign->media()->count());
        $maxBatch = min(self::MAX_PER_REQUEST, $remaining);

        return [
            'images' => ['required', 'array', 'min:1', 'max:'.$maxBatch],
            'images.*' => ['file', 'image', 'max:5120', 'mimes:jpeg,jpg,png,webp,gif'],
        ];
    }
}
