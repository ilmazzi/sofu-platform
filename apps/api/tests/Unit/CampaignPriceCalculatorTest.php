<?php

namespace Tests\Unit;

use App\Modules\Pricing\Domain\CampaignPriceCalculator;
use PHPUnit\Framework\TestCase;

class CampaignPriceCalculatorTest extends TestCase
{
    public function test_it_returns_max_price_when_there_are_no_reservations(): void
    {
        $calculator = new CampaignPriceCalculator;

        $this->assertSame(5000, $calculator->calculate(
            totalAmountCents: 8000,
            activeReservationsCount: 0,
            minPriceCents: 1000,
            maxPriceCents: 5000,
        ));
    }

    public function test_it_clamps_price_between_minimum_and_maximum(): void
    {
        $calculator = new CampaignPriceCalculator;

        $this->assertSame(5000, $calculator->calculate(20000, 2, 1000, 5000));
        $this->assertSame(4000, $calculator->calculate(8000, 2, 1000, 5000));
        $this->assertSame(1000, $calculator->calculate(8000, 20, 1000, 5000));
    }
}
