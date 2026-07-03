<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:mark-overdue')]
#[Description('Marks sent/partially-paid invoices past their due date as overdue.')]
class MarkOverdueInvoices extends Command
{
    public function handle(): int
    {
        $count = Invoice::withoutGlobalScopes()
            ->whereIn('status', ['sent', 'partially_paid'])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => 'overdue']);

        $this->info("Marked {$count} invoice(s) as overdue.");

        return self::SUCCESS;
    }
}
