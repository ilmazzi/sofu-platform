<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('provider_fee_cents')->nullable()->after('amount_cents');
            $table->char('provider_fee_currency', 3)->nullable()->after('provider_fee_cents');
            $table->string('provider_charge_id', 80)->nullable()->after('provider_payment_id');
            $table->string('provider_balance_transaction_id', 80)->nullable()->after('provider_charge_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'provider_fee_cents',
                'provider_fee_currency',
                'provider_charge_id',
                'provider_balance_transaction_id',
            ]);
        });
    }
};

