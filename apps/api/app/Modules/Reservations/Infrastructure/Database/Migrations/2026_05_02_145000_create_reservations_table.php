<?php

use App\Modules\Reservations\Domain\Enums\ReservationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->foreignId('supporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32)->default(ReservationStatus::Active->value)->index();
            $table->unsignedBigInteger('price_quoted_cents');
            $table->unsignedBigInteger('effective_price_cents');
            $table->foreignId('price_snapshot_id')->nullable()->constrained('campaign_price_snapshots')->nullOnDelete();
            $table->string('idempotency_key', 160);
            $table->string('payload_hash', 64);
            $table->timestamps();

            $table->unique(['campaign_id', 'supporter_id']);
            $table->unique(['supporter_id', 'idempotency_key']);
            $table->index(['supporter_id', 'created_at']);
            $table->index(['campaign_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
