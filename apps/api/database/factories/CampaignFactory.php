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
        $title = fake()->sentence(4);

        return [
            'creator_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower((string) Str::ulid()),
            'summary' => fake()->sentence(),
            'description' => fake()->paragraphs(3, true),
            'category' => fake()->randomElement(['education', 'environment', 'health', 'community']),
            'status' => CampaignStatus::Draft,
            'currency' => 'EUR',
            'target_supporters' => fake()->numberBetween(50, 1000),
            'active_reservations_count' => 0,
            'min_price_cents' => 1500,
            'max_price_cents' => 5000,
            'current_price_cents' => 5000,
            'total_amount_cents' => 150000,
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
