<?php

namespace App\Modules\Founding\Application;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Payments\Domain\Contracts\PaymentProvider;
use App\Modules\Reservations\Application\CreateReservationAction;
use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CreateFoundingPledgeAction
{
    public function __construct(
        private readonly PaymentProvider $payments,
        private readonly CreateReservationAction $createReservation,
    ) {}

    /**
     * @return array{reservation: Reservation, created: bool}
     */
    public function execute(User $supporter, int $dropCount, string $setupIntentId, string $idempotencyKey): array
    {
        $campaign = $this->foundingCampaign();

        $setup = $this->payments->retrieveSucceededSetupIntent($setupIntentId);

        $result = $this->createReservation->execute(
            $campaign,
            $supporter,
            $idempotencyKey,
            $dropCount,
        );

        $reservation = $result['reservation'];
        $reservation->forceFill([
            'stripe_payment_method_id' => $setup['payment_method_id'],
            'payment_method_verified_at' => now(),
        ])->save();

        return [
            'reservation' => $reservation->fresh()->load(['campaign', 'priceSnapshot']),
            'created' => $result['created'],
        ];
    }

    public function foundingCampaign(): Campaign
    {
        $slug = (string) config('sofu.founding_campaign_slug', 'sofu-founding');
        $campaign = Campaign::query()->where('slug', $slug)->first();

        if ($campaign === null) {
            throw new NotFoundHttpException('Founding campaign is not available.');
        }

        return $campaign;
    }
}
