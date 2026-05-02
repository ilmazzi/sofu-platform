<?php

namespace App\Modules\Campaigns\Http\Controllers;

use App\Modules\Campaigns\Application\CreateCampaignAction;
use App\Modules\Campaigns\Application\TransitionCampaignStatusAction;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Http\Requests\StoreCampaignRequest;
use App\Modules\Campaigns\Http\Resources\CampaignResource;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CampaignController
{
    public function mine(Request $request): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with('costItems')
            ->where('creator_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return CampaignResource::collection($campaigns);
    }

    public function index(): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with('costItems')
            ->whereIn('status', [
                CampaignStatus::Published,
                CampaignStatus::Activated,
                CampaignStatus::Successful,
                CampaignStatus::Closed,
            ])
            ->latest()
            ->paginate(20);

        return CampaignResource::collection($campaigns);
    }

    public function store(StoreCampaignRequest $request, CreateCampaignAction $createCampaign): CampaignResource
    {
        $request->user()->can('create', Campaign::class) || abort(403);

        $campaign = $createCampaign->execute($request->user(), $request->validated());

        return CampaignResource::make($campaign);
    }

    public function show(Request $request, Campaign $campaign): CampaignResource
    {
        Gate::forUser($request->user())->authorize('view', $campaign);

        return CampaignResource::make($campaign->load('costItems'));
    }

    public function submitForReview(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        $request->user()->can('submitForReview', $campaign) || abort(403);

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::SubmittedForReview, $request->user()));
    }

    public function publish(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        $request->user()->can('publish', $campaign) || abort(403);

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::Published, $request->user()));
    }

    public function approve(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        $request->user()->can('approve', $campaign) || abort(403);

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::Approved, $request->user()));
    }

    public function reject(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        $request->user()->can('reject', $campaign) || abort(403);

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::Rejected, $request->user()));
    }
}
