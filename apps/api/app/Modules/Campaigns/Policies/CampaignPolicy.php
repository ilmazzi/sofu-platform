<?php

namespace App\Modules\Campaigns\Policies;

use App\Models\User;
use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use Illuminate\Auth\Access\Response;

class CampaignPolicy
{
    public function view(?User $user, Campaign $campaign): bool
    {
        if (in_array($campaign->status, [CampaignStatus::Published, CampaignStatus::Activated, CampaignStatus::Successful, CampaignStatus::Closed], true)) {
            return true;
        }

        return $user !== null && ($campaign->creator_id === $user->id || $user->isBackoffice());
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['creator', 'operator', 'admin'], true);
    }

    public function update(User $user, Campaign $campaign): bool|Response
    {
        if ($campaign->creator_id !== $user->id) {
            return Response::deny('Solo il creatore della campagna può modificarla.');
        }

        if ($campaign->active_reservations_count !== 0) {
            return Response::deny(
                'Non puoi modificare la campagna: ci sono già adesioni attive. Contatta il supporto se serve un intervento.',
            );
        }

        if (! in_array($campaign->status, [
            CampaignStatus::Draft,
            CampaignStatus::Approved,
            CampaignStatus::Rejected,
        ], true)) {
            return Response::deny(
                'Le modifiche al testo e ai numeri sono consentite solo in bozza, dopo approvazione (prima della pubblicazione) o dopo un rifiuto in revisione. '
                .'Una campagna già pubblicata, attiva o chiusa non è modificabile da questo modulo.',
            );
        }

        return true;
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        if ($campaign->creator_id !== $user->id) {
            return false;
        }

        if ($campaign->active_reservations_count !== 0) {
            return false;
        }

        return in_array($campaign->status, [
            CampaignStatus::Draft,
            CampaignStatus::SubmittedForReview,
            CampaignStatus::Approved,
            CampaignStatus::Rejected,
        ], true);
    }

    public function submitForReview(User $user, Campaign $campaign): bool
    {
        return $campaign->creator_id === $user->id
            && in_array($campaign->status, [CampaignStatus::Draft, CampaignStatus::Rejected], true);
    }

    public function withdrawFromReview(User $user, Campaign $campaign): bool
    {
        return $campaign->creator_id === $user->id && $campaign->status === CampaignStatus::SubmittedForReview;
    }

    public function publish(User $user, Campaign $campaign): bool
    {
        return $campaign->creator_id === $user->id && $campaign->status === CampaignStatus::Approved;
    }

    public function approve(User $user, Campaign $campaign): bool
    {
        return $user->isBackoffice() && $campaign->status === CampaignStatus::SubmittedForReview;
    }

    public function reject(User $user, Campaign $campaign): bool
    {
        return $user->isBackoffice() && $campaign->status === CampaignStatus::SubmittedForReview;
    }

    public function uploadMedia(User $user, Campaign $campaign): bool|Response
    {
        if (! in_array($campaign->status, [
            CampaignStatus::Draft,
            CampaignStatus::Approved,
            CampaignStatus::Rejected,
        ], true)) {
            return Response::deny(
                'Il caricamento immagini è consentito solo mentre la campagna è in bozza, approvata (non ancora pubblicata) o respinta in revisione.',
            );
        }

        if ($campaign->creator_id !== $user->id && ! $user->isBackoffice()) {
            return Response::deny('Solo il creatore della campagna può caricare la galleria.');
        }

        return true;
    }
}
