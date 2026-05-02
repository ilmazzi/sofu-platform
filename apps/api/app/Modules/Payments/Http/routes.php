<?php

use App\Modules\Payments\Http\Controllers\MockPaymentWebhookController;
use App\Modules\Payments\Http\Controllers\PaymentIntentController;
use App\Modules\Payments\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('payments')->name('payments.')->group(function (): void {
    Route::post('/webhooks/mock', MockPaymentWebhookController::class)->name('webhooks.mock');
    Route::post('/webhooks/stripe', StripeWebhookController::class)->name('webhooks.stripe');
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/reservations/{reservation}/payment-intent', [PaymentIntentController::class, 'store'])
        ->name('reservations.payment-intent.store');
});
