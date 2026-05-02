<?php

use App\Modules\Backoffice\Http\Controllers\BackofficeAuditLogController;
use App\Modules\Backoffice\Http\Controllers\BackofficeCampaignController;
use App\Modules\Backoffice\Http\Controllers\BackofficeLedgerEntryController;
use Illuminate\Support\Facades\Route;

Route::prefix('backoffice')->middleware('auth:sanctum')->name('backoffice.')->group(function (): void {
    Route::get('/campaigns', [BackofficeCampaignController::class, 'index'])->name('campaigns.index');
    Route::get('/campaigns/in-review', [BackofficeCampaignController::class, 'inReview'])->name('campaigns.in-review');
    Route::get('/campaigns/{campaign:slug}', [BackofficeCampaignController::class, 'show'])->name('campaigns.show');
    Route::get('/audit-logs', [BackofficeAuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('/ledger-entries', [BackofficeLedgerEntryController::class, 'index'])->name('ledger-entries.index');
});
