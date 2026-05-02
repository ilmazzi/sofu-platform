<?php

namespace App\Modules\Payments\Domain\Enums;

enum PaymentStatus: string
{
    case RequiresConfirmation = 'requires_confirmation';
    case Authorized = 'authorized';
    case Captured = 'captured';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';
}
