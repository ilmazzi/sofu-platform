<?php

namespace App\Modules\Reservations\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
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
            'idempotency_key' => ['required', 'string', 'max:160'],
            'drop_count' => ['sometimes', 'integer', 'min:1', 'max:10000'],
        ];
    }

    public function dropCount(): int
    {
        return max(1, (int) ($this->validated('drop_count') ?? 1));
    }

    public function idempotencyKey(): string
    {
        return (string) $this->validated('idempotency_key');
    }

    /**
     * @return array<string, mixed>
     */
    public function validationData(): array
    {
        return array_merge($this->all(), [
            'idempotency_key' => $this->header('Idempotency-Key'),
        ]);
    }
}
