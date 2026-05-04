<?php

use App\Modules\Backoffice\Http\Controllers\BackofficeSofuFeeWaiverController;
use App\Modules\Campaigns\Http\Controllers\CampaignController;
use App\Modules\Campaigns\Http\Controllers\CampaignMediaController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me/campaigns', [CampaignController::class, 'mine'])->name('me.campaigns.index');
});

Route::prefix('campaigns')->name('campaigns.')->group(function (): void {
    Route::get('/', [CampaignController::class, 'index'])->name('index');
    Route::get('/{campaign:slug}', [CampaignController::class, 'show'])->name('show');
    Route::post('/', [CampaignController::class, 'store'])->middleware('auth:sanctum')->name('store');
    Route::patch('/{campaign:slug}', [CampaignController::class, 'update'])
        ->middleware('auth:sanctum')
        ->name('update');
    Route::delete('/{campaign:slug}', [CampaignController::class, 'destroy'])
        ->middleware('auth:sanctum')
        ->name('destroy');
    Route::post('/{campaign:slug}/media', [CampaignMediaController::class, 'store'])
        ->middleware('auth:sanctum')
        ->name('media.store');
    Route::post('/{campaign:slug}/submit-for-review', [CampaignController::class, 'submitForReview'])
        ->middleware('auth:sanctum')
        ->name('submit-for-review');
    Route::post('/{campaign:slug}/withdraw-review', [CampaignController::class, 'withdrawFromReview'])
        ->middleware('auth:sanctum')
        ->name('withdraw-review');
    Route::post('/{campaign:slug}/publish', [CampaignController::class, 'publish'])
        ->middleware('auth:sanctum')
        ->name('publish');
});

Route::prefix('backoffice/campaigns')->middleware('auth:sanctum')->name('backoffice.campaigns.')->group(function (): void {
    Route::post('/{campaign:slug}/approve', [CampaignController::class, 'approve'])->name('approve');
    Route::post('/{campaign:slug}/reject', [CampaignController::class, 'reject'])->name('reject');
    Route::post('/{campaign:slug}/sofu-fee-waiver', [BackofficeSofuFeeWaiverController::class, 'store'])->name('sofu-fee-waiver');
});
