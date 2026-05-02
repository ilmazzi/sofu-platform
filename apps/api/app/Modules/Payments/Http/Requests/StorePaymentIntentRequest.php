<?php

namespace App\Modules\Payments\Http\Requests;

use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentIntentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $reservation = $this->route('reservation');

        return $reservation instanceof Reservation
            && $this->user()?->id === $reservation->supporter_id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
