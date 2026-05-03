<?php

namespace App\Modules\Campaigns\Http\Controllers;

use App\Modules\Campaigns\Http\Requests\StoreCampaignMediaRequest;
use App\Modules\Campaigns\Http\Resources\CampaignResource;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CampaignMediaController
{
    public function store(StoreCampaignMediaRequest $request, Campaign $campaign): CampaignResource
    {
        /** @var array<int, UploadedFile> $files */
        $files = $request->validated('images');

        DB::transaction(function () use ($campaign, $files): void {
            $startOrder = (int) ($campaign->media()->max('sort_order') ?? -1);

            foreach ($files as $index => $file) {
                $path = $file->store('campaigns/'.$campaign->id, 'public');
                $campaign->media()->create([
                    'path' => $path,
                    'sort_order' => $startOrder + $index + 1,
                ]);
            }
        });

        return CampaignResource::make($campaign->fresh(['costItems', 'media']));
    }
}
