<?php

namespace App\Modules\Backoffice\Http\Requests;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class DecideSofuFeeWaiverRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        if (! $campaign instanceof Campaign || $this->user() === null) {
            return false;
        }

        Gate::authorize('decideSofuFeeWaiver', $campaign);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'string', 'in:approve,reject'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->input('decision') !== 'reject') {
                return;
            }
            $raw = $this->input('note');
            $note = is_string($raw) ? trim($raw) : '';
            if ($note === '') {
                $validator->errors()->add('note', 'Indica il motivo del diniego per il creator.');
            }
        });
    }
}
