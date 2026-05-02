<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class IdentityPasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_password_reset_link(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'creator@example.com']);

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/forgot-password', [
                'email' => 'creator@example.com',
            ])
            ->assertAccepted()
            ->assertJsonPath('message', 'If the email exists, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_password_reset_updates_user_password(): void
    {
        $user = User::factory()->create([
            'email' => 'creator@example.com',
            'password' => Hash::make('old-password'),
        ]);

        $token = Password::broker()->createToken($user);

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/reset-password', [
                'token' => $token,
                'email' => 'creator@example.com',
                'password' => 'new-secure-password',
                'password_confirmation' => 'new-secure-password',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password));
    }

    public function test_authenticated_user_can_update_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('current-password'),
        ]);

        $this
            ->actingAs($user)
            ->putJson('/api/v1/identity/password', [
                'current_password' => 'current-password',
                'password' => 'next-secure-password',
                'password_confirmation' => 'next-secure-password',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Password updated.');

        $this->assertTrue(Hash::check('next-secure-password', $user->fresh()->password));
    }

    private function fromFrontend(): static
    {
        return $this->withHeader('Referer', 'http://localhost:5173');
    }
}
