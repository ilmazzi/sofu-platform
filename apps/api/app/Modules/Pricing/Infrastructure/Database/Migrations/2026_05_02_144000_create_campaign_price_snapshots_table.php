<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_price_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->unsignedInteger('active_reservations_count');
            $table->unsignedBigInteger('calculated_price_cents');
            $table->unsignedBigInteger('min_price_cents');
            $table->unsignedBigInteger('max_price_cents');
            $table->unsignedBigInteger('total_amount_cents');
            $table->string('reason', 80);
            $table->timestamps();

            $table->index(['campaign_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_price_snapshots');
    }
};
