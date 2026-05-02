<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Modules\Backoffice\Http\Requests\BackofficeCampaignIndexRequest;
use App\Modules\Backoffice\Http\Requests\BackofficeRequest;
use App\Modules\Backoffice\Http\Resources\BackofficeCampaignResource;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BackofficeCampaignController
{
    public function index(BackofficeCampaignIndexRequest $request): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with('creator')
            ->when($request->validated('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->validated('creator_id'), fn ($query, int $creatorId) => $query->where('creator_id', $creatorId))
            ->when($request->validated('q'), function ($query, string $term): void {
                $query->where(function ($query) use ($term): void {
                    $query
                        ->where('title', 'like', "%{$term}%")
                        ->orWhere('slug', 'like', "%{$term}%");
                });
            })
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        return BackofficeCampaignResource::collection($campaigns);
    }

    public function inReview(BackofficeRequest $request): AnonymousResourceCollection
    {
        $campaigns = Campaign::query()
            ->with('creator')
            ->where('status', CampaignStatus::SubmittedForReview)
            ->oldest('updated_at')
            ->paginate(20);

        return BackofficeCampaignResource::collection($campaigns);
    }

    public function show(BackofficeRequest $request, Campaign $campaign): BackofficeCampaignResource
    {
        $campaign->load([
            'creator',
            'costItems',
            'auditLogs' => fn ($query) => $query->limit(20),
        ]);

        return BackofficeCampaignResource::make($campaign);
    }
}
