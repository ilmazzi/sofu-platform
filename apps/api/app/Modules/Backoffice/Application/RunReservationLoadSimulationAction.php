<?php

namespace App\Modules\Backoffice\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Reservations\Application\CancelReservationAction;
use App\Modules\Reservations\Application\CreateReservationAction;
use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Throwable;

final class RunReservationLoadSimulationAction
{
    public function __construct(
        private readonly CreateReservationAction $createReservation,
        private readonly CancelReservationAction $cancelReservation,
    ) {}

    /**
     * Esegue passi casuali di prenotazione / annullo (prima del Bloom) usando le stesse action HTTP.
     *
     * @param  array{
     *     steps?: int,
     *     cancel_probability?: float,
     *     stay_below_bloom?: bool,
     * }  $options
     * @return array<string, mixed>
     */
    public function execute(Campaign $campaign, array $options = []): array
    {
        $steps = min(
            max(1, (int) ($options['steps'] ?? 50)),
            (int) config('sofu.simulation_max_iterations', 500),
        );
        $cancelProbability = min(1.0, max(0.0, (float) ($options['cancel_probability'] ?? 0.25)));
        $stayBelowBloom = (bool) ($options['stay_below_bloom'] ?? true);

        if (! in_array($campaign->status, [CampaignStatus::Published, CampaignStatus::Activated], true)) {
            return $this->errorOutcome($campaign, 'La campagna deve essere in stato published o activated.');
        }

        if ($stayBelowBloom && $campaign->target_supporters < 2) {
            return $this->errorOutcome(
                $campaign,
                'Con stay_below_bloom attivo servono almeno 2 growing drops (target_supporters), altrimenti ogni prenotazione raggiunge subito il Bloom.',
            );
        }

        Notification::fake();

        $started = hrtime(true);
        $reserved = 0;
        $cancelled = 0;
        $skipped = 0;
        $supportersCreated = 0;
        $errors = [];

        for ($i = 0; $i < $steps; $i++) {
            $campaign->refresh();

            $activeCount = (int) $campaign->active_reservations_count;
            $atBloom = $campaign->hasReachedBloom();

            $cancellableExists = Reservation::query()
                ->where('campaign_id', $campaign->id)
                ->where('status', ReservationStatus::Active)
                ->exists();

            $roomForReserve = $stayBelowBloom
                ? $activeCount < $campaign->target_supporters - 1
                : $activeCount < $campaign->target_supporters;

            $roll = mt_rand(1, 10_000) / 10_000;
            $tryCancel = $cancellableExists && ! $atBloom && $roll < $cancelProbability;
            $canReserve = $roomForReserve && ! $atBloom;

            if ($tryCancel) {
                $res = Reservation::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('status', ReservationStatus::Active)
                    ->inRandomOrder()
                    ->first();

                if ($res === null) {
                    $skipped++;

                    continue;
                }

                try {
                    $actor = User::query()->findOrFail($res->supporter_id);
                    $this->cancelReservation->execute($res, $actor);
                    $cancelled++;
                } catch (Throwable $e) {
                    $errors[] = [
                        'step' => $i + 1,
                        'operation' => 'cancel',
                        'message' => $e->getMessage(),
                    ];
                }

                continue;
            }

            if ($canReserve) {
                try {
                    $user = $this->createSimulatedSupporter();
                    $supportersCreated++;
                    $key = 'sim-'.Str::lower((string) Str::ulid());
                    $this->createReservation->execute($campaign->fresh(), $user, $key);
                    $reserved++;
                } catch (Throwable $e) {
                    $errors[] = [
                        'step' => $i + 1,
                        'operation' => 'reserve',
                        'message' => $e->getMessage(),
                    ];
                }

                continue;
            }

            $skipped++;
        }

        $campaign->refresh();
        $elapsedMs = (int) round((hrtime(true) - $started) / 1_000_000);

        return [
            'ok' => true,
            'campaign_slug' => $campaign->slug,
            'steps_requested' => $steps,
            'cancel_probability' => $cancelProbability,
            'stay_below_bloom' => $stayBelowBloom,
            'reservations_created' => $reserved,
            'reservations_cancelled' => $cancelled,
            'supporters_created' => $supportersCreated,
            'steps_skipped_no_op' => $skipped,
            'errors' => $errors,
            'duration_ms' => $elapsedMs,
            'campaign_after' => [
                'active_reservations_count' => $campaign->active_reservations_count,
                'current_price_cents' => $campaign->current_price_cents,
                'has_reached_bloom' => $campaign->hasReachedBloom(),
                'status' => $campaign->status->value,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function errorOutcome(Campaign $campaign, string $message): array
    {
        return [
            'ok' => false,
            'message' => $message,
            'campaign_slug' => $campaign->slug,
            'campaign_after' => [
                'active_reservations_count' => $campaign->active_reservations_count,
                'current_price_cents' => $campaign->current_price_cents,
                'has_reached_bloom' => $campaign->hasReachedBloom(),
                'status' => $campaign->status->value,
            ],
        ];
    }

    /** Nessun Faker: funziona anche con `composer install --no-dev` in produzione. */
    private function createSimulatedSupporter(): User
    {
        $token = Str::lower((string) Str::ulid());

        return User::query()->create([
            'name' => 'Sim supporter '.$token,
            'email' => 'sim+'.$token.'@sim.sofu.local',
            'role' => 'supporter',
            'password' => Hash::make(Str::random(40)),
            'email_verified_at' => now(),
            'remember_token' => Str::random(10),
        ]);
    }
}
