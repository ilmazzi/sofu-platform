<?php

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Reservations\Infrastructure\Eloquent\Reservation;
use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReservationCreatedNotification extends Notification implements ShouldQueue
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
        $effective = number_format($this->reservation->effective_price_cents / 100, 2, ',', ' ');
        $currency = $campaign->currency;

        return (new MailMessage)
            ->subject('Prenotazione confermata — '.$title)
            ->greeting('Ciao '.$notifiable->name.',')
            ->line('Hai confermato la tua prenotazione per la campagna «'.$title.'».')
            ->line('Prezzo effettivo al momento della prenotazione: '.$effective.' '.$currency.'.')
            ->action('Apri la campagna', FrontendUrl::to('/campaigns/'.$slug))
            ->line('Completa il pagamento dalla pagina della campagna quando sei pronto.');
    }
}
