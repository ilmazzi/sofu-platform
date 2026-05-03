<?php

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReservationCancelledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Reservation $reservation,
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
        $this->reservation->loadMissing('campaign');
        $campaign = $this->reservation->campaign;
        $slug = $campaign->slug;
        $title = $campaign->title;

        return (new MailMessage)
            ->subject('Droplet cancellato — '.$title)
            ->greeting('Ciao '.$notifiable->name.',')
            ->line('Il tuo droplet per la campagna «'.$title.'» è stato cancellato.')
            ->action('Apri la campagna', FrontendUrl::to('/campaigns/'.$slug));
    }
}
