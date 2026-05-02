<?php

namespace App\Modules\Backoffice\Http\Controllers;

use App\Modules\Backoffice\Http\Requests\BackofficeLedgerEntryIndexRequest;
use App\Modules\Backoffice\Http\Resources\BackofficeLedgerEntryResource;
use App\Modules\Ledger\Infrastructure\Eloquent\LedgerEntry;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BackofficeLedgerEntryController
{
    public function index(BackofficeLedgerEntryIndexRequest $request): AnonymousResourceCollection
    {
        $entries = LedgerEntry::query()
            ->when($request->validated('account'), fn ($query, string $account) => $query->where('account', $account))
            ->when($request->validated('source_type'), fn ($query, string $sourceType) => $query->where('source_type', $sourceType))
            ->when($request->validated('source_id'), fn ($query, int $sourceId) => $query->where('source_id', $sourceId))
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        return BackofficeLedgerEntryResource::collection($entries);
    }
}
