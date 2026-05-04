<?php

namespace App\Modules\Campaigns\Http\Controllers;

use App\Modules\Campaigns\Application\CreateCampaignAction;
use App\Modules\Campaigns\Application\DestroyCampaignAction;
use App\Modules\Campaigns\Application\TransitionCampaignStatusAction;
use App\Modules\Campaigns\Application\UpdateCampaignAction;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Http\Requests\StoreCampaignRequest;
use App\Modules\Campaigns\Http\Requests\UpdateCampaignRequest;
use App\Modules\Campaigns\Http\Resources\CampaignResource;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CampaignController
{
    public function mine(Request $request): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with(['costItems', 'media'])
            ->where('creator_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return CampaignResource::collection($campaigns);
    }

    public function index(): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with(['costItems', 'media'])
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
        Gate::authorize('view', $campaign);

        return CampaignResource::make($campaign->load(['costItems', 'media']));
    }

    public function update(
        UpdateCampaignRequest $request,
        Campaign $campaign,
        UpdateCampaignAction $updateCampaign,
    ): CampaignResource {
        Gate::authorize('update', $campaign);

        return CampaignResource::make($updateCampaign->execute($campaign, $request->user(), $request->validated()));
    }

    public function destroy(Request $request, Campaign $campaign, DestroyCampaignAction $destroyCampaign): JsonResponse
    {
        Gate::authorize('delete', $campaign);

        $destroyCampaign->execute($campaign, $request->user());

        return response()->json(['message' => 'Campagna eliminata.']);
    }

    public function submitForReview(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        Gate::authorize('submitForReview', $campaign);

        $campaign->loadCount('media');

        if (! $campaign->video_url && $campaign->media_count < 1) {
            throw ValidationException::withMessages([
                'media' => 'Aggiungi un video oppure almeno un’immagine di copertina prima di inviare in revisione.',
            ]);
        }

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::SubmittedForReview, $request->user()));
    }

    public function withdrawFromReview(
        Request $request,
        Campaign $campaign,
        TransitionCampaignStatusAction $transitionCampaignStatus,
    ): CampaignResource {
        Gate::authorize('withdrawFromReview', $campaign);

        return CampaignResource::make($transitionCampaignStatus->execute($campaign, CampaignStatus::Draft, $request->user()));
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
