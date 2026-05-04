<?php

namespace App\Modules\Campaigns\Application;

final class CampaignEconomics
{
    /**
     * @param  array<int, array{amount_cents: int}>  $costItems
     * @return array{total_cents: int, min_price_cents: int, max_price_cents: int}
     */
    public static function deriveFromTargets(array $costItems, int $targetSupporters, int $fullBloomDrops): array
    {
        $total = 0;
        foreach ($costItems as $item) {
            $total += (int) ($item['amount_cents'] ?? 0);
        }

        $n = max(1, $targetSupporters);
        $m = max(1, $fullBloomDrops);

        $min = max(1, (int) round($total / $m));
        $max = max($min + 1, (int) ceil($total / $n));

        return [
            'total_cents' => $total,
            'min_price_cents' => $min,
            'max_price_cents' => $max,
        ];
    }
}
