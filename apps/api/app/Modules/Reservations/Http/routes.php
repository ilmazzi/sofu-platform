<?php

use App\Modules\Reservations\Http\Controllers\ReservationController;
use Illuminate\Support\Facades\Route;

Route::prefix('reservations')->name('reservations.')->group(function (): void {
    //
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/campaigns/{campaign:slug}/reservations', [ReservationController::class, 'store'])
        ->name('campaigns.reservations.store');

    Route::get('/me/reservations', [ReservationController::class, 'mine'])
        ->name('me.reservations.index');

    Route::post('/reservations/{reservation}/drops', [ReservationController::class, 'addDrops'])
        ->name('reservations.drops.add');

    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy'])
        ->name('reservations.destroy');
});
