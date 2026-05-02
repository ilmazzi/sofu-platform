<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class IdentityAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_current_profile(): void
    {
        Notification::fake();

        $response = $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/register', [
                'name' => 'Sofu Creator',
                'email' => 'creator@example.com',
                'password' => 'secure-password',
                'password_confirmation' => 'secure-password',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.type', 'user')
            ->assertJsonPath('data.email', 'creator@example.com');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'creator@example.com']);
    }

    public function test_user_can_login_and_logout(): void
    {
        User::factory()->create([
            'email' => 'supporter@example.com',
            'password' => Hash::make('secure-password'),
        ]);

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/login', [
                'email' => 'supporter@example.com',
                'password' => 'secure-password',
            ])
            ->assertOk()
            ->assertJsonPath('data.email', 'supporter@example.com');

        $this->assertAuthenticated();

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/logout')
            ->assertOk();

        Auth::forgetGuards();

        $this
            ->fromFrontend()
            ->getJson('/api/v1/me')
            ->assertUnauthorized();
    }

    private function fromFrontend(): static
    {
        return $this->withHeader('Referer', 'http://localhost:5173');
    }
}
