<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('video_url', 2048)->nullable()->after('description');
            $table->unsignedInteger('full_bloom_drops')->nullable()->after('target_supporters');
            $table->boolean('is_commercial')->default(false)->after('currency');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('
                UPDATE campaigns
                SET full_bloom_drops = GREATEST(CEIL(total_amount_cents::float / 100), target_supporters + 1)
                WHERE full_bloom_drops IS NULL
            ');
        } else {
            $rows = DB::table('campaigns')->whereNull('full_bloom_drops')->get();
            foreach ($rows as $row) {
                $total = (int) $row->total_amount_cents;
                $n = (int) $row->target_supporters;
                $m = max((int) ceil($total / 100), $n + 1);
                DB::table('campaigns')->where('id', $row->id)->update(['full_bloom_drops' => $m]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['video_url', 'full_bloom_drops', 'is_commercial']);
        });
    }
};
