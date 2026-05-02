<?php

namespace App\Modules\Payments\Infrastructure\Eloquent;

use Illuminate\Database\Eloquent\Model;

class PaymentProviderEvent extends Model
{
    protected $fillable = [
        'provider',
        'provider_event_id',
        'event_type',
        'processed_at',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
            'payload' => 'array',
        ];
    }
}
