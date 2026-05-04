<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\SofuFeeWaiverState;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class DecideCampaignSofuFeeWaiverAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Campaign $campaign, User $actor, bool $approve, ?string $note): Campaign
    {
        return DB::transaction(function () use ($campaign, $actor, $approve, $note): Campaign {
            $locked = Campaign::query()->whereKey($campaign->id)->lockForUpdate()->firstOrFail();

            $locked->sofu_fee_waiver_state = $approve
                ? SofuFeeWaiverState::Approved
                : SofuFeeWaiverState::Rejected;
            $locked->sofu_fee_waiver_review_note = $note;

            $economics = CampaignEconomics::recalculateFromPersistedCampaign($locked);
            $locked->forceFill([
                'total_amount_cents' => $economics['total_cents'],
                'min_price_cents' => $economics['min_price_cents'],
                'max_price_cents' => $economics['max_price_cents'],
            ]);
            if ($locked->active_reservations_count === 0) {
                $locked->current_price_cents = $economics['max_price_cents'];
            }

            $locked->save();

            $this->audit->record(AuditActions::CAMPAIGN_SOFU_FEE_WAIVER_DECIDED, $actor, $locked, [
                'decision' => $approve ? 'approved' : 'rejected',
                'note' => $note,
            ]);

            return $locked->fresh(['costItems', 'media']);
        });
    }
}
