<?php

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CampaignSubmittedForReviewNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Campaign $campaign,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->campaign->loadMissing('creator');
        $creator = $this->campaign->creator;

        return (new MailMessage)
            ->subject('Nuova campagna in revisione — '.$this->campaign->title)
            ->greeting('Ciao '.$notifiable->name.',')
            ->line(($creator?->name ?? 'Un creator').' ha inviato la campagna «'.$this->campaign->title.'» per la revisione.')
            ->action('Apri in backoffice', FrontendUrl::to('/backoffice/review'))
            ->line('Puoi approvare o rifiutare dalla pagina della campagna.');
    }
}
