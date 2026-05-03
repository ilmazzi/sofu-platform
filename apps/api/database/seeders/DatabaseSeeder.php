<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Local / staging users (password for all: `password`).
     *
     * supporter@sofu.test — supporter
     * creator@sofu.test — creator (+ sample campaigns)
     * operator@sofu.test — backoffice approve/reject
     * admin@sofu.test — admin
     */
    public function run(): void
    {
        $password = Hash::make('password');

        User::query()->updateOrCreate(
            ['email' => 'supporter@sofu.test'],
            [
                'name' => 'Supporter Seed',
                'password' => $password,
                'role' => 'supporter',
            ],
        );

        $creator = User::query()->updateOrCreate(
            ['email' => 'creator@sofu.test'],
            [
                'name' => 'Creator Seed',
                'password' => $password,
                'role' => 'creator',
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'operator@sofu.test'],
            [
                'name' => 'Operator Seed',
                'password' => $password,
                'role' => 'operator',
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@sofu.test'],
            [
                'name' => 'Admin Seed',
                'password' => $password,
                'role' => 'admin',
            ],
        );

        $draft = Campaign::query()->updateOrCreate(
            ['slug' => 'campagna-bozza-seed'],
            [
                'creator_id' => $creator->id,
                'title' => 'Campagna bozza (seed)',
                'summary' => 'Esempio in stato draft.',
                'description' => str_repeat('Descrizione campagna di seed per superare la lunghezza minima richiesta dall API. ', 2),
                'category' => 'education',
                'status' => CampaignStatus::Draft,
                'currency' => 'EUR',
                'target_supporters' => 100,
                'active_reservations_count' => 0,
                'min_price_cents' => 1000,
                'max_price_cents' => 8000,
                'current_price_cents' => 8000,
                'total_amount_cents' => 400_000,
                'published_at' => null,
                'starts_at' => null,
                'ends_at' => now()->addMonths(3),
            ],
        );
        $draft->costItems()->delete();
        $draft->costItems()->createMany([
            ['label' => 'Materiali', 'amount_cents' => 250_000, 'sort_order' => 0],
            ['label' => 'Logistica', 'amount_cents' => 150_000, 'sort_order' => 1],
        ]);

        $published = Campaign::query()->updateOrCreate(
            ['slug' => 'campagna-pubblica-seed'],
            [
                'creator_id' => $creator->id,
                'title' => 'Campagna pubblica (seed)',
                'summary' => 'Pubblicata per test droplets.',
                'description' => str_repeat('Descrizione campagna pubblica di seed per test end-to-end. ', 2),
                'category' => 'community',
                'status' => CampaignStatus::Published,
                'currency' => 'EUR',
                'target_supporters' => 200,
                'active_reservations_count' => 0,
                'min_price_cents' => 500,
                'max_price_cents' => 5000,
                'current_price_cents' => 5000,
                'total_amount_cents' => 50_000,
                'published_at' => now(),
                'starts_at' => null,
                'ends_at' => now()->addMonths(6),
            ],
        );
        $published->costItems()->delete();
        $published->costItems()->createMany([
            ['label' => 'Obiettivo', 'amount_cents' => 50_000, 'sort_order' => 0],
        ]);
    }
}
