<?php

namespace App\Modules\Campaigns\Application;

use App\Models\User;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\Audit\AuditActions;
use App\Support\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DestroyCampaignAction
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Campaign $campaign, User $actor): void
    {
        DB::transaction(function () use ($campaign, $actor): void {
            $locked = Campaign::query()->whereKey($campaign->id)->lockForUpdate()->firstOrFail();
            $locked->load('media');

            foreach ($locked->media as $media) {
                if ($media->path) {
                    Storage::disk('public')->delete($media->path);
                }
            }

            $this->audit->record(AuditActions::CAMPAIGN_DELETED, $actor, $locked, [
                'slug' => $locked->slug,
            ]);

            $locked->delete();
        });
    }
}
