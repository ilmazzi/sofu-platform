<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Modules\Backoffice\Http\Requests\BackofficeAuditLogIndexRequest;
use App\Modules\Backoffice\Http\Resources\BackofficeAuditLogResource;
use App\Support\Audit\AuditLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BackofficeAuditLogController
{
    public function index(BackofficeAuditLogIndexRequest $request): AnonymousResourceCollection
    {
        $logs = AuditLog::query()
            ->when($request->validated('action'), fn ($query, string $action) => $query->where('action', $action))
            ->when($request->validated('actor_id'), fn ($query, int $actorId) => $query->where('actor_id', $actorId))
            ->when($request->validated('target_type'), fn ($query, string $targetType) => $query->where('target_type', $targetType))
            ->when($request->validated('target_id'), fn ($query, int $targetId) => $query->where('target_id', $targetId))
            ->when($request->validated('request_id'), fn ($query, string $requestId) => $query->where('request_id', $requestId))
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        return BackofficeAuditLogResource::collection($logs);
    }
}
