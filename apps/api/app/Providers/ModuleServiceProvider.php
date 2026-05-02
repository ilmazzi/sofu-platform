<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadModuleMigrations();
        $this->loadModuleRoutes();
    }

    private function loadModuleMigrations(): void
    {
        foreach (glob(app_path('Modules/*/Infrastructure/Database/Migrations'), GLOB_ONLYDIR) ?: [] as $path) {
            $this->loadMigrationsFrom($path);
        }
    }

    private function loadModuleRoutes(): void
    {
        foreach (glob(app_path('Modules/*/Http/routes.php')) ?: [] as $routeFile) {
            Route::middleware('api')
                ->prefix('api/v1')
                ->name('api.v1.')
                ->group($routeFile);
        }
    }
}
