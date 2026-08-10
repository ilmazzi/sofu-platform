<?php

namespace App\Modules\Payments\Domain;

readonly class SetupIntentData
{
    public function __construct(
        public string $provider,
        public string $setupIntentId,
        public string $clientSecret,
    ) {}
}
