<?php

namespace App\Modules\Campaigns\Domain;

/**
 * Soglia Bloom operativa: target sostenitori + cuscinetto incassi (campaign-funding-and-deadline §2.3).
 */
final class BloomSupportersThreshold
{
    /**
     * Numero minimo di prenotazioni attive richieste per considerare raggiunto il Bloom sul conteggio.
     *
     * @param  float  $paymentAttritionBuffer  Decimale es. 0.10 = 10%; deve essere ≥ 0.
     */
    public static function count(int $targetSupporters, float $paymentAttritionBuffer): int
    {
        if ($targetSupporters <= 0) {
            return 0;
        }

        $buffer = max(0.0, $paymentAttritionBuffer);

        return (int) ceil($targetSupporters * (1 + $buffer));
    }
}
