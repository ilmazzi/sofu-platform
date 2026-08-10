<?php

$rawSimulation = env('SIMULATION_ENABLED');
$hasExplicitSimulation = is_string($rawSimulation) && trim($rawSimulation) !== '';

$simulationEnabled = $hasExplicitSimulation
    ? filter_var($rawSimulation, FILTER_VALIDATE_BOOL)
    : ! in_array((string) env('APP_ENV', 'production'), ['production'], true);

$rawBuffer = env('SOFU_PAYMENT_ATTRITION_BUFFER', '0.10');
$paymentAttritionBuffer = is_numeric($rawBuffer) ? (float) $rawBuffer : 0.10;
$paymentAttritionBuffer = max(0.0, min(0.5, $paymentAttritionBuffer));

return [

    /*
    |--------------------------------------------------------------------------
    | Cuscinetto incassi (Bloom / goal)
    |--------------------------------------------------------------------------
    |
    | Percentuale aggiuntiva oltre target_supporters (decimale: 0.10 = 10%).
    | Allineato a docs/campaign-funding-and-deadline.md §2.3. Override tipico 7%–15%.
    |
    */
    'payment_attrition_buffer' => $paymentAttritionBuffer,

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

    /*
    |--------------------------------------------------------------------------
    | Campaign timezone (deadlines)
    |--------------------------------------------------------------------------
    |
    | Deadlines are computed at the creator's local midnight (end of day),
    | but stored in UTC. Until the product collects per-user timezones, we
    | default to a single IANA timezone.
    |
    */
    'default_campaign_timezone' => (string) env('SOFU_DEFAULT_CAMPAIGN_TIMEZONE', 'Europe/Rome'),

    /*
    |--------------------------------------------------------------------------
    | Campagna fondante (Sostieni SoFu)
    |--------------------------------------------------------------------------
    */
    'founding_campaign_slug' => (string) env('SOFU_FOUNDING_CAMPAIGN_SLUG', 'sofu-founding'),

];
