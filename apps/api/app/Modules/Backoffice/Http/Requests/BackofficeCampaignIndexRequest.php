<?php

namespace App\Modules\Backoffice\Http\Requests;

use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use Illuminate\Validation\Rule;

class BackofficeCampaignIndexRequest extends BackofficeRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::enum(CampaignStatus::class)],
            'creator_id' => ['sometimes', 'integer', 'exists:users,id'],
            'q' => ['sometimes', 'string', 'max:120'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
