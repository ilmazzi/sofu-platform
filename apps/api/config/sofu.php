<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Simulazione carico (solo admin)
    |--------------------------------------------------------------------------
    |
    | Disattiva in produzione con SIMULATION_ENABLED=false. Se non impostato,
    | è attiva quando APP_ENV non è "production".
    |
    */
    'simulation_enabled' => env('SIMULATION_ENABLED') !== null
        ? filter_var(env('SIMULATION_ENABLED'), FILTER_VALIDATE_BOOL)
        : ! in_array((string) env('APP_ENV', 'production'), ['production'], true),

    'simulation_max_iterations' => max(1, min(10_000, (int) env('SIMULATION_MAX_ITERATIONS', 500))),

];
