<?php

use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::prefix('identity')->middleware('web')->name('identity.')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('guest')->name('register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('guest')->name('login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum')->name('logout');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('guest')->name('password.email');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('guest')->name('password.reset');
    Route::put('/password', [AuthController::class, 'updatePassword'])->middleware('auth:sanctum')->name('password.update');
    Route::post('/email/verification-notification', [AuthController::class, 'sendEmailVerificationNotification'])
        ->middleware(['auth:sanctum', 'throttle:6,1'])
        ->name('email.send');
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('email.verify');
});
