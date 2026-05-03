<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This project uses a separate SPA (Cloudflare Pages) and a Laravel API
    | (api.so-fu.org). We allow credentialed requests from the SPA origins.
    |
    */

    // Apply CORS headers to these paths.
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Comma-separated list of allowed origins (scheme + host).
    // Example: https://so-fu.org,https://www.so-fu.org
    'allowed_origins' => array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Required for Sanctum cookie auth from a different origin (SPA).
    'supports_credentials' => true,
];
