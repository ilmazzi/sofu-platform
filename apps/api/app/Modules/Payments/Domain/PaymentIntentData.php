<?php

namespace App\Modules\Payments\Domain;

class PaymentIntentData
{
    public function __construct(
        public readonly string $provider,
        public readonly string $providerPaymentId,
        public readonly string $clientSecret,
        public readonly int $amountCents,
        public readonly string $currency,
    ) {}
}
