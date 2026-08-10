<?php

use App\Modules\Founding\Http\Controllers\FoundingController;
use Illuminate\Support\Facades\Route;

/*
| Sanctum statefulApi() already provides session + CSRF for the SPA.
| Do NOT wrap these routes in middleware('web') — double StartSession breaks
| auth on subsequent POSTs (setup-intent / pledge → 401 Unauthenticated).
*/
Route::prefix('founding')->name('founding.')->group(function (): void {
    Route::get('/campaign', [FoundingController::class, 'campaign'])->name('campaign');

    Route::post('/bootstrap', [FoundingController::class, 'bootstrap'])
        ->middleware('throttle:20,1')
        ->name('bootstrap');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/setup-intent', [FoundingController::class, 'setupIntent'])
            ->middleware('throttle:30,1')
            ->name('setup-intent');
        Route::post('/pledge', [FoundingController::class, 'pledge'])
            ->middleware('throttle:20,1')
            ->name('pledge');
        Route::get('/my-reservation', [FoundingController::class, 'myReservation'])->name('my-reservation');
    });
});
