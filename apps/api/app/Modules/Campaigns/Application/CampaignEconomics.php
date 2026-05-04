<?php

namespace App\Modules\Campaigns\Application;

use App\Modules\Campaigns\Domain\Enums\SofuFeeWaiverState;
use App\Modules\Campaigns\Domain\SofuPlatformFee;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;

final class CampaignEconomics
{
    /**
     * @param  array<int, array{amount_cents: int}>  $costItems
     * @return array{total_cents: int, subtotal_cents: int, min_price_cents: int, max_price_cents: int}
     */
    public static function deriveFromTargets(
        array $costItems,
        int $targetSupporters,
        int $fullBloomDrops,
        bool $includeSofuPlatformLineInGross,
    ): array {
        $partial = 0;
        foreach ($costItems as $item) {
            $partial += (int) ($item['amount_cents'] ?? 0);
        }

        $gross = SofuPlatformFee::grossTotalCents($partial, $includeSofuPlatformLineInGross);

        $n = max(1, $targetSupporters);
        $m = max(1, $fullBloomDrops);

        $min = max(1, (int) round($gross / $m));
        $max = max($min + 1, (int) ceil($gross / $n));

        return [
            'total_cents' => $gross,
            'subtotal_cents' => $partial,
            'min_price_cents' => $min,
            'max_price_cents' => $max,
        ];
    }

    /** In creazione: nessuna esenzione ancora approvata. */
    public static function includeSofuPlatformLineForCreate(int $partialCents): bool
    {
        return SofuPlatformFee::partialExceedsSofuThreshold($partialCents);
    }

    /**
     * In aggiornamento: esenzione approvata vale solo se il creator mantiene la richiesta e il parziale non è cambiato.
     */
    public static function includeSofuPlatformLineForUpdate(
        Campaign $locked,
        int $newPartialCents,
        bool $waiverRequested,
        int $previousPartialCents,
    ): bool {
        if (! SofuPlatformFee::partialExceedsSofuThreshold($newPartialCents)) {
            return false;
        }

        if ($locked->sofu_fee_waiver_state === SofuFeeWaiverState::Approved
            && $waiverRequested
            && $previousPartialCents === $newPartialCents) {
            return false;
        }

        return true;
    }

    public static function includeSofuPlatformLineForPersistedCampaign(Campaign $campaign, int $partialCents): bool
    {
        if (! SofuPlatformFee::partialExceedsSofuThreshold($partialCents)) {
            return false;
        }

        return $campaign->sofu_fee_waiver_state !== SofuFeeWaiverState::Approved;
    }

    /**
     * Ricalcola min/max/totale lordo da campagna già persistita (es. dopo decisione esenzione).
     *
     * @return array{total_cents: int, subtotal_cents: int, min_price_cents: int, max_price_cents: int}
     */
    public static function recalculateFromPersistedCampaign(Campaign $campaign): array
    {
        $campaign->loadMissing('costItems');

        $items = $campaign->costItems->map(fn ($i) => ['amount_cents' => $i->amount_cents])->values()->all();
        $partial = (int) $campaign->costItems->sum('amount_cents');
        $includeSofu = self::includeSofuPlatformLineForPersistedCampaign($campaign, $partial);

        return self::deriveFromTargets(
            $items,
            $campaign->target_supporters,
            max(1, (int) ($campaign->full_bloom_drops ?? 1)),
            $includeSofu,
        );
    }
}
