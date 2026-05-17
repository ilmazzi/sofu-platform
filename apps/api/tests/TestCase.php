<?php

namespace Tests;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Crea prenotazioni attive fino al raggiungimento della soglia Bloom (incluso cuscinetto config).
     */
    protected function reserveUntilBloom(Campaign $campaign): void
    {
        $n = 0;
        while (! $campaign->fresh()->hasReachedBloom()) {
            $user = User::factory()->create();
            $this->actingAs($user)
                ->withHeader('Idempotency-Key', 'fill-bloom-'.$campaign->id.'-'.(++$n))
                ->postJson("/api/v1/campaigns/{$campaign->slug}/reservations")
                ->assertCreated();
            $campaign->refresh();
        }
    }
}
