<?php

namespace App\Modules\Reservations\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddReservationDropsRequest extends FormRequest
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
            'additional_drop_count' => ['required', 'integer', 'min:1', 'max:10000'],
        ];
    }

    public function additionalDropCount(): int
    {
        return (int) $this->validated('additional_drop_count');
    }
}
