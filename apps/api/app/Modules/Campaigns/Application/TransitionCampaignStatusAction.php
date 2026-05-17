<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Domain\Exceptions\InvalidCampaignTransition;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Modules\Notifications\Infrastructure\Notifications\CampaignApprovedNotification;
use App\Modules\Notifications\Infrastructure\Notifications\CampaignPublishedNotification;
use App\Modules\Notifications\Infrastructure\Notifications\CampaignRejectedNotification;
use App\Modules\Notifications\Infrastructure\Notifications\CampaignSubmittedForReviewNotification;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class TransitionCampaignStatusAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Campaign $campaign, CampaignStatus $to, ?User $actor = null): Campaign
    {
        $fresh = DB::transaction(function () use ($campaign, $to, $actor): Campaign {
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

            $this->audit->record($this->auditAction($from, $to), $actor, $lockedCampaign, [
                'from' => $from->value,
                'to' => $to->value,
            ]);

            return $lockedCampaign->fresh(['costItems', 'media']);
        });

        $this->dispatchTransitionNotifications($fresh, $to);

        return $fresh;
    }

    private function dispatchTransitionNotifications(Campaign $campaign, CampaignStatus $to): void
    {
        $campaign->loadMissing('creator');

        match ($to) {
            CampaignStatus::SubmittedForReview => User::query()
                ->whereIn('role', ['operator', 'admin'])
                ->each(fn (User $user) => $user->notify(new CampaignSubmittedForReviewNotification($campaign))),
            CampaignStatus::Approved => $campaign->creator?->notify(new CampaignApprovedNotification($campaign)),
            CampaignStatus::Rejected => $campaign->creator?->notify(new CampaignRejectedNotification($campaign)),
            CampaignStatus::Published => $campaign->creator?->notify(new CampaignPublishedNotification($campaign)),
            default => null,
        };
    }

    private function canTransition(CampaignStatus $from, CampaignStatus $to): bool
    {
        return match ($from) {
            CampaignStatus::Draft => $to === CampaignStatus::SubmittedForReview,
            CampaignStatus::Rejected => $to === CampaignStatus::SubmittedForReview,
            CampaignStatus::SubmittedForReview => in_array($to, [
                CampaignStatus::Approved,
                CampaignStatus::Rejected,
                CampaignStatus::Draft,
            ], true),
            CampaignStatus::Approved => $to === CampaignStatus::Published,
            CampaignStatus::Published => in_array($to, [
                CampaignStatus::Activated,
                CampaignStatus::Cancelled,
                CampaignStatus::Expired,
                CampaignStatus::Successful,
                CampaignStatus::Failed,
            ], true),
            CampaignStatus::Activated => in_array($to, [CampaignStatus::Successful, CampaignStatus::Closed, CampaignStatus::Cancelled, CampaignStatus::Failed], true),
            default => false,
        };
    }

    private function auditAction(CampaignStatus $from, CampaignStatus $to): string
    {
        if ($from === CampaignStatus::SubmittedForReview && $to === CampaignStatus::Draft) {
            return AuditActions::CAMPAIGN_WITHDRAWN_FROM_REVIEW;
        }

        return match ($to) {
            CampaignStatus::SubmittedForReview => AuditActions::CAMPAIGN_SUBMITTED_FOR_REVIEW,
            CampaignStatus::Approved => AuditActions::CAMPAIGN_APPROVED,
            CampaignStatus::Rejected => AuditActions::CAMPAIGN_REJECTED,
            CampaignStatus::Published => AuditActions::CAMPAIGN_PUBLISHED,
            CampaignStatus::Activated => AuditActions::CAMPAIGN_ACTIVATED,
            CampaignStatus::Successful => AuditActions::CAMPAIGN_SUCCESSFUL,
            CampaignStatus::Closed => AuditActions::CAMPAIGN_CLOSED,
            CampaignStatus::Cancelled => AuditActions::CAMPAIGN_CANCELLED,
            CampaignStatus::Expired => AuditActions::CAMPAIGN_EXPIRED,
            CampaignStatus::Failed => AuditActions::CAMPAIGN_FAILED,
            default => AuditActions::CAMPAIGN_STATUS_CHANGED,
        };
    }
}
