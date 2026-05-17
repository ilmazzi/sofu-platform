<?php

namespace App\Modules\Campaigns\Application;

use App\Modules\Campaigns\Domain\CampaignCostItemLabel;

final class NormalizeCampaignCostItems
{
    /**
     * Garantisce una sola voce «Guadagno» in coda (importo ≥ 0).
     *
     * @param  array<int, array{label: string, amount_cents: int}>  $items
     * @return array<int, array{label: string, amount_cents: int}>
     */
    public static function normalize(array $items): array
    {
        $others = [];
        $guadagnoCents = 0;

        foreach ($items as $item) {
            $label = trim((string) ($item['label'] ?? ''));
            $cents = max(0, (int) ($item['amount_cents'] ?? 0));

            if ($label === '' || CampaignCostItemLabel::isGuadagno($label)) {
                $guadagnoCents = $cents;

                continue;
            }

            $others[] = [
                'label' => $label,
                'amount_cents' => $cents,
            ];
        }

        $others[] = [
            'label' => CampaignCostItemLabel::GUADAGNO,
            'amount_cents' => $guadagnoCents,
        ];

        return $others;
    }

    /**
     * @param  array<int, array{label: string, amount_cents: int}>  $items
     */
    public static function nonGuadagnoSubtotalCents(array $items): int
    {
        $sum = 0;
        foreach ($items as $item) {
            if (CampaignCostItemLabel::isGuadagno((string) ($item['label'] ?? ''))) {
                continue;
            }
            $sum += (int) ($item['amount_cents'] ?? 0);
        }

        return $sum;
    }
}
