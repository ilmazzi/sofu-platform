<?php

namespace App\Modules\Campaigns\Domain;

final class CampaignCostItemLabel
{
    public const GUADAGNO = 'Guadagno';

    public static function isGuadagno(string $label): bool
    {
        return mb_strtolower(trim($label)) === mb_strtolower(self::GUADAGNO);
    }
}
