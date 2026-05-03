<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Models\User;
use App\Modules\Backoffice\Http\Requests\BackofficeUserIndexRequest;
use App\Modules\Backoffice\Http\Requests\BackofficeUserUpdateRequest;
use App\Modules\Backoffice\Http\Resources\BackofficeUserResource;
use App\Support\Audit\AuditLogger;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BackofficeUserController
{
    public function index(BackofficeUserIndexRequest $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->when($request->validated('role'), fn ($query, string $role) => $query->where('role', $role))
            ->when($request->validated('search'), fn ($query, string $search) => $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        return BackofficeUserResource::collection($users);
    }

    public function show(User $user): BackofficeUserResource
    {
        return new BackofficeUserResource($user);
    }

    public function update(BackofficeUserUpdateRequest $request, User $user, AuditLogger $audit): BackofficeUserResource
    {
        $oldRole = $user->role;
        $user->role = $request->validated('role');
        $user->save();

        $audit->record('user.role_updated', $request->user(), $user, [
            'old_role' => $oldRole,
            'new_role' => $user->role,
        ]);

        return new BackofficeUserResource($user);
    }
}
