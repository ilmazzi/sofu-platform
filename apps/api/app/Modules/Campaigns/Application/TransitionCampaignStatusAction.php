<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Domain\Exceptions\InvalidCampaignTransition;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class TransitionCampaignStatusAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Campaign $campaign, CampaignStatus $to, ?User $actor = null): Campaign
    {
        return DB::transaction(function () use ($campaign, $to, $actor): Campaign {
            $lockedCampaign = Campaign::query()
                ->whereKey($campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            $from = $lockedCampaign->status;

            if (! $this->canTransition($from, $to)) {
                throw InvalidCampaignTransition::fromTo($from->value, $to->value);
            }

            $attributes = ['status' => $to];

            if ($to === CampaignStatus::Published) {
                $attributes['published_at'] = now();
                $attributes['starts_at'] = $lockedCampaign->starts_at ?? now();
            }

            $lockedCampaign->forceFill($attributes)->save();

            $this->audit->record($this->auditAction($to), $actor, $lockedCampaign, [
                'from' => $from->value,
                'to' => $to->value,
            ]);

            return $lockedCampaign->fresh(['costItems']);
        });
    }

    private function canTransition(CampaignStatus $from, CampaignStatus $to): bool
    {
        return match ($from) {
            CampaignStatus::Draft => $to === CampaignStatus::SubmittedForReview,
            CampaignStatus::SubmittedForReview => in_array($to, [CampaignStatus::Approved, CampaignStatus::Rejected], true),
            CampaignStatus::Approved => $to === CampaignStatus::Published,
            CampaignStatus::Published => in_array($to, [CampaignStatus::Activated, CampaignStatus::Cancelled, CampaignStatus::Expired], true),
            CampaignStatus::Activated => in_array($to, [CampaignStatus::Successful, CampaignStatus::Closed, CampaignStatus::Cancelled, CampaignStatus::Failed], true),
            default => false,
        };
    }

    private function auditAction(CampaignStatus $to): string
    {
        return match ($to) {
            CampaignStatus::SubmittedForReview => 'campaign.submitted_for_review',
            CampaignStatus::Approved => 'campaign.approved',
            CampaignStatus::Rejected => 'campaign.rejected',
            CampaignStatus::Published => 'campaign.published',
            CampaignStatus::Activated => 'campaign.activated',
            CampaignStatus::Successful => 'campaign.successful',
            CampaignStatus::Closed => 'campaign.closed',
            CampaignStatus::Cancelled => 'campaign.cancelled',
            CampaignStatus::Expired => 'campaign.expired',
            CampaignStatus::Failed => 'campaign.failed',
            default => 'campaign.status_changed',
        };
    }
}
