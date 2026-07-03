<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('sku')->nullable();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->enum('type', ['product', 'service'])->default('product');
            $table->string('category')->nullable();
            $table->string('unit')->nullable()->comment('e.g. piece, kg, hour');
            $table->decimal('cost_price', 18, 2)->default(0);
            $table->decimal('sale_price', 18, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(15)->comment('percentage, default KSA VAT');
            $table->boolean('track_inventory')->default(true);
            $table->decimal('quantity_on_hand', 18, 3)->default(0);
            $table->decimal('reorder_level', 18, 3)->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
