<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Crea/aggiorna la campagna fondante esattamente come in prodotto.
 *
 * Prod:
 *   SOFU_FOUNDING_CREATOR_EMAIL=tuo@email.it php artisan db:seed --class=FoundingCampaignSeeder --force
 *
 * Opzionale reset quote a zero (solo se vuoi ripartire da 0):
 *   SOFU_FOUNDING_RESET_COUNTS=1 php artisan db:seed --class=FoundingCampaignSeeder --force
 */
class FoundingCampaignSeeder extends Seeder
{
    public function run(): void
    {
        $creator = $this->resolveCreator();
        $slug = (string) config('sofu.founding_campaign_slug', 'sofu-founding');
        $resetCounts = filter_var(env('SOFU_FOUNDING_RESET_COUNTS', false), FILTER_VALIDATE_BOOL);

        $totalCents = 14_000_100; // 140.001 €
        $minCents = 100; // 1 €
        $maxCents = 500_004; // ceil(14000100 / 28)
        $target = 28;
        $fullBloom = 140_001;

        $founding = Campaign::query()->firstOrNew(['slug' => $slug]);
        $wasNew = ! $founding->exists;

        $founding->fill([
            'creator_id' => $creator->id,
            'title' => 'Sostieni SoFu',
            'summary' => 'Campagna fondante: usiamo SoFu per finanziare SoFu.',
            'description' => 'Raccolta fondi per realizzare la piattaforma SoFu: sviluppo, sicurezza, costi legali, marketing, server e help desk. Guadagno piattaforma: 1 euro.',
            'video_url' => null,
            'category' => 'community',
            'status' => CampaignStatus::Published,
            'currency' => 'EUR',
            'is_commercial' => false,
            'target_supporters' => $target,
            'full_bloom_drops' => $fullBloom,
            'min_price_cents' => $minCents,
            'max_price_cents' => $maxCents,
            'total_amount_cents' => $totalCents,
            'published_at' => $founding->published_at ?? now(),
            'starts_at' => null,
            'ends_at' => $founding->ends_at ?? now()->addMonths(12),
        ]);

        if ($wasNew || $resetCounts) {
            $founding->active_reservations_count = 0;
            $founding->current_price_cents = $maxCents;
        } else {
            $active = (int) ($founding->active_reservations_count ?? 0);
            $founding->current_price_cents = $active <= 0
                ? $maxCents
                : max($minCents, min($maxCents, (int) ceil($totalCents / $active)));
        }

        $founding->save();

        $founding->costItems()->delete();
        $founding->costItems()->createMany([
            ['label' => 'Sviluppo', 'amount_cents' => 5_000_000, 'sort_order' => 0],
            ['label' => 'Sicurezza', 'amount_cents' => 800_000, 'sort_order' => 1],
            ['label' => 'Costi legali', 'amount_cents' => 2_000_000, 'sort_order' => 2],
            ['label' => 'Marketing e comunicazione', 'amount_cents' => 5_000_000, 'sort_order' => 3],
            ['label' => 'Server+HelpDesk', 'amount_cents' => 1_200_000, 'sort_order' => 4],
            ['label' => 'Guadagno', 'amount_cents' => 100, 'sort_order' => 5],
        ]);

        $this->command?->info(sprintf(
            'Campagna fondante %s (id=%d, slug=%s, active=%d, current=%d).',
            $wasNew ? 'creata' : 'aggiornata',
            $founding->id,
            $founding->slug,
            $founding->active_reservations_count,
            $founding->current_price_cents,
        ));
    }

    private function resolveCreator(): User
    {
        $email = trim((string) env('SOFU_FOUNDING_CREATOR_EMAIL', ''));
        if ($email !== '') {
            $user = User::query()->where('email', $email)->first();
            if ($user === null) {
                throw new RuntimeException(
                    "SOFU_FOUNDING_CREATOR_EMAIL={$email} non esiste. Crea prima l’utente creator/admin.",
                );
            }

            return $user;
        }

        $existing = User::query()
            ->whereIn('role', ['creator', 'admin'])
            ->orderBy('id')
            ->first();
        if ($existing !== null) {
            return $existing;
        }

        if (app()->environment('production')) {
            throw new RuntimeException(
                'Nessun creator/admin trovato. Imposta SOFU_FOUNDING_CREATOR_EMAIL=email@esistente.it',
            );
        }

        return User::query()->updateOrCreate(
            ['email' => 'creator@sofu.test'],
            [
                'name' => 'Creator Seed',
                'password' => Hash::make('password'),
                'role' => 'creator',
            ],
        );
    }
}
