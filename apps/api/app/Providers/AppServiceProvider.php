<?php

namespace App\Providers;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Campaigns\Policies\CampaignPolicy;
use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Payments\Infrastructure\Providers\MockPaymentProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PaymentProvider::class, MockPaymentProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Campaign::class, CampaignPolicy::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return rtrim((string) config('app.frontend_url'), '/')."/reset-password?{$query}";
        });

        VerifyEmail::createUrlUsing(function (object $notifiable): string {
            $verificationUrl = URL::temporarySignedRoute(
                'api.v1.identity.email.verify',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
            );

            return rtrim((string) config('app.frontend_url'), '/').'/verify-email?'.http_build_query([
                'url' => $verificationUrl,
            ]);
        });
    }
}
