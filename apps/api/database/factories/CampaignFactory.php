<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    protected $model = Campaign::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = \fake()->sentence(4);
        $target = \fake()->numberBetween(30, 90);
        $total = \fake()->numberBetween(150_000, 450_000);
        $fullBloom = $target * 3;
        $min = max(1, (int) round($total / $fullBloom));
        $max = max($min + 1, (int) ceil($total / $target));

        return [
            'creator_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower((string) Str::ulid()),
            'summary' => \fake()->sentence(),
            'description' => \fake()->paragraphs(3, true),
            'video_url' => 'https://example.com/seed-promo-video',
            'category' => \fake()->randomElement([
                'tech', 'art', 'music', 'education', 'environment', 'health', 'community',
            ]),
            'status' => CampaignStatus::Draft,
            'currency' => 'EUR',
            'is_commercial' => false,
            'target_supporters' => $target,
            'full_bloom_drops' => $fullBloom,
            'active_reservations_count' => 0,
            'min_price_cents' => $min,
            'max_price_cents' => $max,
            'current_price_cents' => $max,
            'total_amount_cents' => $total,
            'published_at' => null,
            'starts_at' => null,
            'ends_at' => now()->addMonths(2),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CampaignStatus::Published,
            'published_at' => now(),
        ]);
    }
}
