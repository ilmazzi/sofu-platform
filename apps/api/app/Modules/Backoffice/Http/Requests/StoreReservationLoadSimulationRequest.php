<?php

namespace App\Modules\Backoffice\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationLoadSimulationRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! config('sofu.simulation_enabled')) {
            return false;
        }

        return $this->user()?->isAdmin() === true;
    }

    protected function failedAuthorization(): void
    {
        if (! config('sofu.simulation_enabled')) {
            abort(404);
        }

        parent::failedAuthorization();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $max = (int) config('sofu.simulation_max_iterations', 500);

        return [
            'campaign_slug' => ['required', 'string', 'max:255'],
            'steps' => ['sometimes', 'integer', 'min:1', 'max:'.$max],
            'cancel_probability' => ['sometimes', 'numeric', 'min:0', 'max:1'],
            'stay_below_bloom' => ['sometimes', 'boolean'],
        ];
    }
}
