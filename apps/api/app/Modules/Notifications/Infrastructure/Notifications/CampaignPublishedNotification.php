<?php

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Campaigns\Infrastructure\Eloquent\Campaign;
use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CampaignPublishedNotification extends Notification implements ShouldQueue
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
        return (new MailMessage)
            ->subject('Campagna pubblicata — '.$this->campaign->title)
            ->greeting('Ciao '.$notifiable->name.',')
            ->line('La tua campagna «'.$this->campaign->title.'» è ora pubblica: i sostenitori possono aggiungere droplets.')
            ->action('Vedi la pagina pubblica', FrontendUrl::to('/campaigns/'.$this->campaign->slug));
    }
}
