<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Models\User;
use App\Modules\Identity\Http\Requests\ForgotPasswordRequest;
use App\Modules\Identity\Http\Requests\LoginRequest;
use App\Modules\Identity\Http\Requests\RegisterRequest;
use App\Modules\Identity\Http\Requests\ResetPasswordRequest;
use App\Modules\Identity\Http\Requests\UpdatePasswordRequest;
use App\Modules\Identity\Http\Resources\UserResource;
use App\Support\Audit\AuditLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController
{
    public function register(RegisterRequest $request, AuditLogger $audit): UserResource
    {
        $data = $request->validated();
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'] ?? 'supporter',
        ]);

        event(new Registered($user));

        Auth::login($user);
        $request->session()->regenerate();

        $audit->record('identity.registered', $user, $user);

        return UserResource::make($user);
    }

    public function login(LoginRequest $request, AuditLogger $audit): UserResource
    {
        if (! Auth::attempt($request->credentials(), $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        $audit->record('identity.logged_in', $request->user(), $request->user());

        return UserResource::make($request->user());
    }

    public function logout(Request $request, AuditLogger $audit): JsonResponse
    {
        $user = $request->user();

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $audit->record('identity.logged_out', $user, $user);

        return response()->json(['message' => 'Logged out.']);
    }

    public function forgotPassword(ForgotPasswordRequest $request, AuditLogger $audit): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        $audit->record('identity.password_reset_requested', metadata: [
            'email_hash' => hash('sha256', $request->validated('email')),
        ]);

        return response()->json([
            'message' => 'If the email exists, a password reset link has been sent.',
        ], 202);
    }

    public function resetPassword(ResetPasswordRequest $request, AuditLogger $audit): JsonResponse
    {
        $resetUser = null;
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password) use (&$resetUser): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $resetUser = $user;

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        $audit->record('identity.password_reset_completed', $resetUser, $resetUser);

        return response()->json(['message' => __($status)]);
    }

    public function updatePassword(UpdatePasswordRequest $request, AuditLogger $audit): JsonResponse
    {
        $request->user()->forceFill([
            'password' => Hash::make($request->validated('password')),
            'remember_token' => Str::random(60),
        ])->save();

        $audit->record('identity.password_updated', $request->user(), $request->user());

        return response()->json(['message' => 'Password updated.']);
    }

    public function sendEmailVerificationNotification(Request $request, AuditLogger $audit): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->user()->sendEmailVerificationNotification();

        $audit->record('identity.email_verification_requested', $request->user(), $request->user());

        return response()->json(['message' => 'Verification link sent.'], 202);
    }
}
