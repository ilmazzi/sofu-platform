<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Simulazione carico (solo admin)
    |--------------------------------------------------------------------------
    |
    | Disattiva in produzione con SIMULATION_ENABLED=false. Se non impostato (o vuoto),
    | è attiva quando APP_ENV non è "production".
    |
    */
    'simulation_enabled' => (function (): bool {
        $raw = env('SIMULATION_ENABLED');
        $explicit = is_string($raw) && trim($raw) !== '';

        if ($explicit) {
            return filter_var($raw, FILTER_VALIDATE_BOOL);
        }

        return ! in_array((string) env('APP_ENV', 'production'), ['production'], true);
    })(),

    'simulation_max_iterations' => max(1, min(10_000, (int) env('SIMULATION_MAX_ITERATIONS', 500))),

];
