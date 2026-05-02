<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment provider driver
    |--------------------------------------------------------------------------
    |
    | Supported: "mock", "stripe"
    |
    */

    'driver' => env('PAYMENT_PROVIDER', 'mock'),

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

];
