<?php

$rawSimulation = env('SIMULATION_ENABLED');
$hasExplicitSimulation = is_string($rawSimulation) && trim($rawSimulation) !== '';

$simulationEnabled = $hasExplicitSimulation
    ? filter_var($rawSimulation, FILTER_VALIDATE_BOOL)
    : ! in_array((string) env('APP_ENV', 'production'), ['production'], true);

return [

    /*
    |--------------------------------------------------------------------------
    | Simulazione carico (solo admin)
    |--------------------------------------------------------------------------
    |
    | Disattiva in produzione con SIMULATION_ENABLED=false. Se non impostato (o vuoto),
    | è attiva quando APP_ENV non è "production".
    |
    | Dopo aver cambiato .env: `php artisan config:clear` (e di nuovo `config:cache` se lo usi).
    |
    */
    'simulation_enabled' => $simulationEnabled,

    'simulation_max_iterations' => max(1, min(10_000, (int) env('SIMULATION_MAX_ITERATIONS', 500))),

];
