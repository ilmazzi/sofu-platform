<?php

use App\Modules\Campaigns\Domain\Enums\CampaignStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('summary', 500)->nullable();
            $table->text('description');
            $table->string('category')->nullable();
            $table->string('status', 32)->default(CampaignStatus::Draft->value)->index();
            $table->char('currency', 3)->default('EUR');
            $table->unsignedInteger('target_supporters');
            $table->unsignedInteger('active_reservations_count')->default(0);
            $table->unsignedBigInteger('min_price_cents');
            $table->unsignedBigInteger('max_price_cents');
            $table->unsignedBigInteger('current_price_cents');
            $table->unsignedBigInteger('total_amount_cents')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
            $table->index(['creator_id', 'status']);
        });

        Schema::create('campaign_cost_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->string('label');
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['campaign_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_cost_items');
        Schema::dropIfExists('campaigns');
    }
};
