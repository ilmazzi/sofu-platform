<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Modules\Backoffice\Application\RunReservationLoadSimulationAction;
use App\Modules\Backoffice\Http\Requests\StoreReservationLoadSimulationRequest;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Http\JsonResponse;

class BackofficeReservationSimulationController
{
    public function store(
        StoreReservationLoadSimulationRequest $request,
        RunReservationLoadSimulationAction $action,
    ): JsonResponse {
        $data = $request->validated();
        $campaign = Campaign::query()->where('slug', $data['campaign_slug'])->firstOrFail();

        $options = [];
        if (array_key_exists('steps', $data)) {
            $options['steps'] = (int) $data['steps'];
        }
        if (array_key_exists('cancel_probability', $data)) {
            $options['cancel_probability'] = (float) $data['cancel_probability'];
        }
        if (array_key_exists('stay_below_bloom', $data)) {
            $options['stay_below_bloom'] = (bool) $data['stay_below_bloom'];
        }

        $result = $action->execute($campaign, $options);

        $status = ($result['ok'] ?? false) ? 200 : 422;

        return response()->json($result, $status);
    }
}
