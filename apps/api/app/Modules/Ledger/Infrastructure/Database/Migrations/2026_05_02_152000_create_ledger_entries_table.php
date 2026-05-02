<?php

use App\Modules\Ledger\Domain\Enums\LedgerEntryDirection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->string('account', 160)->index();
            $table->string('direction', 20)->default(LedgerEntryDirection::Credit->value);
            $table->unsignedBigInteger('amount_cents');
            $table->char('currency', 3);
            $table->nullableMorphs('source');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['source_type', 'source_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
    }
};
