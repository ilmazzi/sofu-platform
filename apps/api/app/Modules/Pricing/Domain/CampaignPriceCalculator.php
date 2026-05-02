<?php

namespace App\Modules\Pricing\Domain;

class CampaignPriceCalculator
{
    public function calculate(
        int $totalAmountCents,
        int $activeReservationsCount,
        int $minPriceCents,
        int $maxPriceCents,
    ): int {
        if ($activeReservationsCount <= 0) {
            return $maxPriceCents;
        }

        $rawPrice = (int) ceil($totalAmountCents / $activeReservationsCount);

        return max($minPriceCents, min($maxPriceCents, $rawPrice));
    }
}
