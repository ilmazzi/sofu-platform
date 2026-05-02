<?php

namespace App\Support\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(string $action, ?Model $actor = null, ?Model $target = null, array $metadata = []): AuditLog
    {
        $request = App::bound('request') ? request() : null;

        return AuditLog::create([
            'action' => $action,
            'actor_type' => $actor?->getMorphClass(),
            'actor_id' => $actor?->getKey(),
            'target_type' => $target?->getMorphClass(),
            'target_id' => $target?->getKey(),
            'request_id' => $this->requestId($request),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
    }

    private function requestId(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        return $request->attributes->get('request_id') ?? $request->headers->get('X-Request-Id');
    }
}
