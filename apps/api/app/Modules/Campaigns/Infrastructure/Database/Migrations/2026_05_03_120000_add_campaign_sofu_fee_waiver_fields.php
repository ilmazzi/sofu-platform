<?php

use App\Modules\Campaigns\Domain\Enums\SofuFeeWaiverState;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table): void {
            $table->boolean('sofu_fee_waiver_requested')->default(false)->after('is_commercial');
            $table->string('sofu_fee_waiver_state', 32)->default(SofuFeeWaiverState::NotRequested->value)->after('sofu_fee_waiver_requested');
            $table->text('sofu_fee_waiver_review_note')->nullable()->after('sofu_fee_waiver_state');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table): void {
            $table->dropColumn([
                'sofu_fee_waiver_requested',
                'sofu_fee_waiver_state',
                'sofu_fee_waiver_review_note',
            ]);
        });
    }
};
