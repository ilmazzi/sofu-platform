<?php

namespace App\Modules\Campaigns\Domain\Enums;

enum SofuFeeWaiverState: string
{
    case NotRequested = 'not_requested';
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
