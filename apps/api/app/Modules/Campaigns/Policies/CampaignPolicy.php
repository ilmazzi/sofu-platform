<?php

namespace App\Modules\Campaigns\Policies;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;

class CampaignPolicy
{
    public function view(?User $user, Campaign $campaign): bool
    {
        if (in_array($campaign->status, [CampaignStatus::Published, CampaignStatus::Activated, CampaignStatus::Successful, CampaignStatus::Closed], true)) {
            return true;
        }

        return $user !== null && ($campaign->creator_id === $user->id || $user->isBackoffice());
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['creator', 'operator', 'admin'], true);
    }

    public function submitForReview(User $user, Campaign $campaign): bool
    {
        return $campaign->creator_id === $user->id && $campaign->status === CampaignStatus::Draft;
    }

    public function publish(User $user, Campaign $campaign): bool
    {
        return $campaign->creator_id === $user->id && $campaign->status === CampaignStatus::Approved;
    }

    public function approve(User $user, Campaign $campaign): bool
    {
        return $user->isBackoffice() && $campaign->status === CampaignStatus::SubmittedForReview;
    }

    public function reject(User $user, Campaign $campaign): bool
    {
        return $user->isBackoffice() && $campaign->status === CampaignStatus::SubmittedForReview;
    }

    public function uploadMedia(User $user, Campaign $campaign): bool
    {
        if ($campaign->status !== CampaignStatus::Draft) {
            return false;
        }

        return $campaign->creator_id === $user->id || $user->isBackoffice();
    }
}
