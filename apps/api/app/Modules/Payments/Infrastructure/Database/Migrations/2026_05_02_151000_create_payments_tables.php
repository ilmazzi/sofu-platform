<?php

use App\Modules\Payments\Domain\Enums\PaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->string('provider', 40);
            $table->string('provider_payment_id')->unique();
            $table->string('status', 40)->default(PaymentStatus::RequiresConfirmation->value)->index();
            $table->unsignedBigInteger('amount_cents');
            $table->char('currency', 3);
            $table->string('client_secret')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();

            $table->index(['reservation_id', 'status']);
            $table->index(['provider', 'status']);
        });

        Schema::create('payment_provider_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 40);
            $table->string('provider_event_id');
            $table->string('event_type', 120);
            $table->timestamp('processed_at')->nullable();
            $table->json('payload');
            $table->timestamps();

            $table->unique(['provider', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_provider_events');
        Schema::dropIfExists('payments');
    }
};
