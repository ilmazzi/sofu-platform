<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class IdentityEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_email_verification_link(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this
            ->actingAs($user)
            ->postJson('/api/v1/identity/email/verification-notification')
            ->assertAccepted()
            ->assertJsonPath('message', 'Verification link sent.');

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_signed_email_verification_url_marks_email_as_verified(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'api.v1.identity.email.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ],
        );

        $this
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('message', 'Email verified.');

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }
}
