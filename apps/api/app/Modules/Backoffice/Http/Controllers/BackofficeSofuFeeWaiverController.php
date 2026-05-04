<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Modules\Backoffice\Http\Requests\DecideSofuFeeWaiverRequest;
use App\Modules\Campaigns\Application\DecideCampaignSofuFeeWaiverAction;
use App\Modules\Campaigns\Http\Resources\CampaignResource;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;

class BackofficeSofuFeeWaiverController
{
    public function store(
        DecideSofuFeeWaiverRequest $request,
        Campaign $campaign,
        DecideCampaignSofuFeeWaiverAction $action,
    ): CampaignResource {
        /** @var array{decision: string, note?: string|null} $data */
        $data = $request->validated();
        $approve = $data['decision'] === 'approve';
        $rawNote = $data['note'] ?? null;
        $note = is_string($rawNote) ? trim($rawNote) : null;
        if ($note === '') {
            $note = null;
        }

        return CampaignResource::make($action->execute($campaign, $request->user(), $approve, $note));
    }
}
