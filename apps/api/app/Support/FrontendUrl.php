<?php

namespace App\Support;

final class FrontendUrl
{
    public static function to(string $path = ''): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        $path = $path === '' ? '' : '/'.ltrim($path, '/');

        return $base.$path;
    }
}
