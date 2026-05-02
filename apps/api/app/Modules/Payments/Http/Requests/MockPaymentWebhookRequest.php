<?php

namespace App\Modules\Payments\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MockPaymentWebhookRequest extends FormRequest
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
            'event_id' => ['required', 'string', 'max:160'],
            'type' => ['required', 'string', Rule::in(['payment.authorized', 'payment.captured', 'payment.failed'])],
            'provider_payment_id' => ['required', 'string', 'max:160'],
            'failure_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
