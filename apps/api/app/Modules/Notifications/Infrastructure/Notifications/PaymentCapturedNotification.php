<?php

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Payments\Infrastructure\Eloquent\Payment;
use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentCapturedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Payment $payment,
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
        $this->payment->loadMissing('reservation.campaign');
        $reservation = $this->payment->reservation;
        $campaign = $reservation->campaign;
        $amount = number_format($this->payment->amount_cents / 100, 2, ',', ' ');

        return (new MailMessage)
            ->subject('Pagamento registrato — '.$campaign->title)
            ->greeting('Ciao '.$notifiable->name.',')
            ->line('Abbiamo registrato il pagamento di '.$amount.' '.$this->payment->currency.' per la campagna «'.$campaign->title.'».')
            ->action('Dettaglio campagna', FrontendUrl::to('/campaigns/'.$campaign->slug));
    }
}
