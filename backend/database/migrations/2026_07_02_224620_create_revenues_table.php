<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('revenue_number');
            $table->string('category')->nullable();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete()
                ->comment('revenue account in chart of accounts');
            $table->decimal('amount', 18, 2);
            $table->date('revenue_date');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'card', 'cheque', 'other'])->default('cash');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->restrictOnDelete();
            $table->text('description')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'revenue_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
    }
};
