<?php

namespace App\Modules\Campaigns\Domain\Enums;

enum CampaignStatus: string
{
    case Draft = 'draft';
    case SubmittedForReview = 'submitted_for_review';
    case Approved = 'approved';
    case Published = 'published';
    case Activated = 'activated';
    case Successful = 'successful';
    case Closed = 'closed';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Failed = 'failed';
}
