<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_id_is_returned_and_stored_on_audit_logs(): void
    {
        $response = $this
            ->withHeader('X-Request-Id', 'req_test_123')
            ->fromFrontend()
            ->postJson('/api/v1/identity/register', [
                'name' => 'Audit User',
                'email' => 'audit@example.com',
                'password' => 'secure-password',
                'password_confirmation' => 'secure-password',
            ]);

        $response
            ->assertCreated()
            ->assertHeader('X-Request-Id', 'req_test_123');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'identity.registered',
            'request_id' => 'req_test_123',
        ]);
    }

    public function test_password_reset_actions_are_audited_without_token(): void
    {
        $user = User::factory()->create([
            'email' => 'reset-audit@example.com',
            'password' => Hash::make('old-password'),
        ]);
        $token = Password::broker()->createToken($user);

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/forgot-password', [
                'email' => 'reset-audit@example.com',
            ])
            ->assertAccepted();

        $this
            ->fromFrontend()
            ->postJson('/api/v1/identity/reset-password', [
                'token' => $token,
                'email' => 'reset-audit@example.com',
                'password' => 'new-secure-password',
                'password_confirmation' => 'new-secure-password',
            ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'identity.password_reset_requested',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'identity.password_reset_completed',
            'target_id' => $user->id,
        ]);

        $this->assertDatabaseMissing('audit_logs', [
            'metadata' => $token,
        ]);
    }

    public function test_campaign_lifecycle_actions_are_audited(): void
    {
        $creator = User::factory()->creator()->create();
        $operator = User::factory()->operator()->create();
        $campaign = Campaign::factory()->create([
            'creator_id' => $creator->id,
            'status' => CampaignStatus::Draft,
        ]);

        $this
            ->actingAs($creator)
            ->postJson("/api/v1/campaigns/{$campaign->slug}/submit-for-review")
            ->assertOk();

        $this
            ->actingAs($operator)
            ->postJson("/api/v1/backoffice/campaigns/{$campaign->slug}/approve")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign.submitted_for_review',
            'actor_id' => $creator->id,
            'target_id' => $campaign->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign.approved',
            'actor_id' => $operator->id,
            'target_id' => $campaign->id,
        ]);
    }

    public function test_reservation_and_price_change_are_audited(): void
    {
        $supporter = User::factory()->create();
        $campaign = Campaign::factory()->published()->create([
            'total_amount_cents' => 8000,
            'min_price_cents' => 1000,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
        ]);

        $this
            ->actingAs($supporter)
            ->withHeader('Idempotency-Key', 'audit-reservation')
            ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.created',
            'actor_id' => $supporter->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign.price_changed',
            'target_id' => $campaign->id,
        ]);
    }

    private function fromFrontend(): static
    {
        return $this->withHeader('Referer', 'http://localhost:5173');
    }
}
