<?php

namespace App\Modules\Reservations\Domain\Enums;

enum ReservationStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case ConvertedToPayment = 'converted_to_payment';
    case Failed = 'failed';
}
