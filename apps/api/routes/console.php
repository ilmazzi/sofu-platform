<?php

use App\Modules\Backoffice\Application\RunReservationLoadSimulationAction;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\SimulationGate;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command(
    'sofu:simulate-reservations {slug : Campaign slug} {--steps=50} {--cancel-probability=0.25} {--allow-bloom : Do not cap reservations below Bloom}',
    function (RunReservationLoadSimulationAction $action): int {
        if (! SimulationGate::enabled()) {
            $this->error('Simulazione disattiva (sofu.simulation_enabled / SIMULATION_ENABLED).');

            return 1;
        }

        $campaign = Campaign::query()->where('slug', $this->argument('slug'))->first();
        if ($campaign === null) {
            $this->error('Campagna non trovata.');

            return 1;
        }

        $options = [
            'steps' => (int) $this->option('steps'),
            'cancel_probability' => (float) $this->option('cancel-probability'),
            'stay_below_bloom' => ! (bool) $this->option('allow-bloom'),
        ];

        $out = $action->execute($campaign, $options);
        $this->line(json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return ($out['ok'] ?? false) ? 0 : 1;
    },
)->purpose('Simula prenotazioni/annulli su una campagna (stessi flussi applicativi)');
