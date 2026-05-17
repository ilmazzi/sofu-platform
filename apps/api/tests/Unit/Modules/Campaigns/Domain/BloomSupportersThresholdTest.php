<?php

namespace Tests\Unit\Modules\Campaigns\Domain;

use App\Modules\Campaigns\Domain\BloomSupportersThreshold;
use PHPUnit\Framework\TestCase;

class BloomSupportersThresholdTest extends TestCase
{
    public function test_zero_target_returns_zero(): void
    {
        $this->assertSame(0, BloomSupportersThreshold::count(0, 0.10));
    }

    public function test_applies_ceiling_with_buffer(): void
    {
        $this->assertSame(3, BloomSupportersThreshold::count(2, 0.10));
        $this->assertSame(2, BloomSupportersThreshold::count(1, 0.10));
        $this->assertSame(11, BloomSupportersThreshold::count(10, 0.10));
    }

    public function test_zero_buffer_matches_target(): void
    {
        $this->assertSame(10, BloomSupportersThreshold::count(10, 0.0));
    }
}
