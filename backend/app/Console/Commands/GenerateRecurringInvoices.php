<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\InvoiceTotalsCalculator;
use App\Services\JournalPostingService;
use App\Services\NumberGenerator;
use App\Services\ZatcaQrCodeGenerator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

#[Signature('invoices:generate-recurring')]
#[Description('Generates and auto-sends the next occurrence of every due recurring invoice.')]
class GenerateRecurringInvoices extends Command
{
    public function handle(JournalPostingService $posting): int
    {
        $due = Invoice::withoutGlobalScopes()
            ->where('is_recurring', true)
            ->whereNotNull('next_recurrence_date')
            ->whereDate('next_recurrence_date', '<=', now()->toDateString())
            ->whereIn('status', ['sent', 'partially_paid', 'paid', 'overdue'])
            ->with('items')
            ->get();

        $this->info("Found {$due->count()} recurring invoice(s) due.");

        foreach ($due as $template) {
            try {
                $this->generateNext($template, $posting);
                $this->line("Generated next occurrence for {$template->invoice_number}.");
            } catch (\Throwable $e) {
                Log::error('Failed to generate recurring invoice', [
                    'invoice_id' => $template->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Failed for {$template->invoice_number}: {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }

    private function generateNext(Invoice $template, JournalPostingService $posting): void
    {
        DB::transaction(function () use ($template, $posting) {
            $items = $template->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'description' => $item->description,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'tax_rate' => (float) $item->tax_rate,
                'discount' => (float) $item->discount,
            ])->all();

            $totals = InvoiceTotalsCalculator::computeTotals($items);
            $issueDate = now()->toDateString();
            $dueDate = $template->due_date
                ? now()->addDays($template->issue_date->diffInDays($template->due_date))->toDateString()
                : null;

            $next = Invoice::create([
                'company_id' => $template->company_id,
                'type' => $template->type,
                'invoice_number' => NumberGenerator::next(Invoice::query(), $template->type === 'sales' ? 'INV' : 'PINV', $template->company_id),
                'customer_id' => $template->customer_id,
                'supplier_id' => $template->supplier_id,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'status' => 'draft',
                'currency' => $template->currency,
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discount_total'],
                'tax_total' => $totals['tax_total'],
                'total' => $totals['total'],
                'notes' => $template->notes,
                'is_recurring' => true,
                'recurring_interval' => $template->recurring_interval,
            ]);

            foreach ($items as $order => $item) {
                $next->items()->create($item + [
                    'line_total' => InvoiceTotalsCalculator::lineTotal($item),
                    'line_order' => $order,
                ]);
            }

            $posting->postInvoice($next);

            $updates = [
                'status' => 'sent',
                'sent_at' => now(),
                'next_recurrence_date' => $next->nextRecurrenceDateFrom(now()),
            ];

            if ($next->type === 'sales') {
                $updates['zatca_uuid'] = (string) Str::uuid();
                $updates['zatca_qr_code'] = ZatcaQrCodeGenerator::generate(
                    $next->company->name,
                    $next->company->tax_number ?? '',
                    now(),
                    (float) $next->total,
                    (float) $next->tax_total,
                );
            }

            $next->update($updates);

            // Advance the template's own next_recurrence_date too, so it
            // isn't picked up again on the next run of this command.
            $template->update(['next_recurrence_date' => $next->next_recurrence_date]);
        });
    }
}
