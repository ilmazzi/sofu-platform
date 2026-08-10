<?php

namespace App\Modules\Founding\Application;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ResolveFoundingCampaignAction
{
    public function execute(): Campaign
    {
        $slug = (string) config('sofu.founding_campaign_slug', 'sofu-founding');
        $campaign = Campaign::query()->where('slug', $slug)->first();

        if ($campaign === null) {
            throw new NotFoundHttpException('Founding campaign is not available.');
        }

        return $campaign;
    }
}
