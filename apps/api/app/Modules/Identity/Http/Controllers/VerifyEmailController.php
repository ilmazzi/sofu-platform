<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Models\User;
use App\Support\Audit\AuditLogger;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;

class VerifyEmailController
{
    public function __invoke(string $id, string $hash, AuditLogger $audit): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(hash_equals($hash, sha1($user->getEmailForVerification())), 403);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));

            $audit->record('identity.email_verified', $user, $user);
        }

        return response()->json(['message' => 'Email verified.']);
    }
}
