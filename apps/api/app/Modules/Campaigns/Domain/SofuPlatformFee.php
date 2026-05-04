<?php

namespace App\Modules\Campaigns\Domain;

/**
 * Commissioni sulla base del **parziale** (somma voci di costo). Il **totale da ripartire** tra le drop (lordo raccolta)
 * = parziale + commissione transazione (2,5%) + eventuale riga SoFu (2,5% oltre soglia, salvo esenzione approvata).
 */
final class SofuPlatformFee
{
    /** Somma voci di costo oltre la quale si applica il 2,5% SoFu (5.000,00 €). */
    public const THRESHOLD_CENTS = 500_000;

    /** 2,5% = 250 basis points. */
    public const BASIS_POINTS = 250;

    public static function partialExceedsSofuThreshold(int $partialCents): bool
    {
        return $partialCents > self::THRESHOLD_CENTS;
    }

    public static function transactionFeeCents(int $partialCents): int
    {
        return (int) round($partialCents * self::BASIS_POINTS / 10000);
    }

    /** Commissione SoFu sul parziale; $chargeSofuLine false se esenzione approvata o sotto soglia. */
    public static function sofuPlatformFeeCents(int $partialCents, bool $chargeSofuLine): int
    {
        if (! $chargeSofuLine || ! self::partialExceedsSofuThreshold($partialCents)) {
            return 0;
        }

        return (int) round($partialCents * self::BASIS_POINTS / 10000);
    }

    public static function grossTotalCents(int $partialCents, bool $includeSofuPlatformLine): int
    {
        return $partialCents
            + self::transactionFeeCents($partialCents)
            + self::sofuPlatformFeeCents($partialCents, $includeSofuPlatformLine);
    }
}
