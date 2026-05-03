<?php

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
    Route::post('/{campaign:slug}/media', [CampaignMediaController::class, 'store'])
        ->middleware('auth:sanctum')
        ->name('media.store');
    Route::post('/{campaign:slug}/submit-for-review', [CampaignController::class, 'submitForReview'])
        ->middleware('auth:sanctum')
        ->name('submit-for-review');
    Route::post('/{campaign:slug}/publish', [CampaignController::class, 'publish'])
        ->middleware('auth:sanctum')
        ->name('publish');
});

Route::prefix('backoffice/campaigns')->middleware('auth:sanctum')->name('backoffice.campaigns.')->group(function (): void {
    Route::post('/{campaign:slug}/approve', [CampaignController::class, 'approve'])->name('approve');
    Route::post('/{campaign:slug}/reject', [CampaignController::class, 'reject'])->name('reject');
});
