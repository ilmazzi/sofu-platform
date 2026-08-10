<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->string('stripe_payment_method_id')->nullable()->after('payload_hash');
            $table->timestamp('payment_method_verified_at')->nullable()->after('stripe_payment_method_id');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropColumn(['stripe_payment_method_id', 'payment_method_verified_at']);
        });
    }
};
