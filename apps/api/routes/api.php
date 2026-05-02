<?php

use App\Modules\Identity\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/health', fn () => [
        'status' => 'ok',
        'service' => 'sofu-api',
    ])->name('health');

    Route::middleware('auth:sanctum')->get('/me', fn (Request $request) => UserResource::make($request->user()))
        ->name('me');
});
