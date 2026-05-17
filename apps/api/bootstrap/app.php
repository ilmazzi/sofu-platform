<?php

use App\Http\Middleware\AssignRequestId;
use App\Modules\Campaigns\Domain\Exceptions\InvalidCampaignTransition;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('sofu:process-campaign-funding-closures')->everyFiveMinutes();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->append(AssignRequestId::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidCampaignTransition $exception) {
            return response()->json([
                'error' => [
                    'code' => 'invalid_campaign_transition',
                    'message' => $exception->getMessage(),
                ],
            ], 409);
        });
    })->create();
