<?php

use App\Modules\Payments\Http\Controllers\MockPaymentWebhookController;
use App\Modules\Payments\Http\Controllers\PaymentIntentController;
use Illuminate\Support\Facades\Route;

Route::prefix('payments')->name('payments.')->group(function (): void {
    Route::post('/webhooks/mock', MockPaymentWebhookController::class)->name('webhooks.mock');
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/reservations/{reservation}/payment-intent', [PaymentIntentController::class, 'store'])
        ->name('reservations.payment-intent.store');
});
