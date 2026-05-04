<?php

use App\Modules\Backoffice\Http\Controllers\BackofficeAuditLogController;
use App\Modules\Backoffice\Http\Controllers\BackofficeCampaignController;
use App\Modules\Backoffice\Http\Controllers\BackofficeLedgerEntryController;
use App\Modules\Backoffice\Http\Controllers\BackofficeReservationSimulationController;
use App\Modules\Backoffice\Http\Controllers\BackofficeStatsController;
use App\Modules\Backoffice\Http\Controllers\BackofficeUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('backoffice')->middleware('auth:sanctum')->name('backoffice.')->group(function (): void {
    Route::post('/simulations/reservation-load', [BackofficeReservationSimulationController::class, 'store'])
        ->name('simulations.reservation-load.store');
    Route::get('/stats', [BackofficeStatsController::class, 'index'])->name('stats.index');
    Route::get('/campaigns', [BackofficeCampaignController::class, 'index'])->name('campaigns.index');
    Route::get('/campaigns/in-review', [BackofficeCampaignController::class, 'inReview'])->name('campaigns.in-review');
    Route::get('/campaigns/{campaign:slug}', [BackofficeCampaignController::class, 'show'])->name('campaigns.show');
    Route::get('/audit-logs', [BackofficeAuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('/ledger-entries', [BackofficeLedgerEntryController::class, 'index'])->name('ledger-entries.index');
    Route::get('/users', [BackofficeUserController::class, 'index'])->name('users.index');
    Route::get('/users/{user}', [BackofficeUserController::class, 'show'])->name('users.show');
    Route::patch('/users/{user}', [BackofficeUserController::class, 'update'])->name('users.update');
});
