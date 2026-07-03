<?php

namespace App\Services;

use App\Models\BankTransfer;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Revenue;
use Illuminate\Support\Facades\DB;

/**
 * Auto-posts journal entries for source documents (invoices, payments,
 * expenses, revenues, bank transfers), so users never have to hand-build
 * double-entry postings for everyday transactions.
 *
 * NOTE: VAT is netted through a single "VAT Payable" account for both
 * output tax (sales) and input tax (purchases), which is a deliberate
 * simplification for small-business use. A production ZATCA-compliant
 * setup would split input/output VAT into separate accounts.
 */
class JournalPostingService
{
    public function postInvoice(Invoice $invoice): JournalEntry
    {
        return DB::transaction(function () use ($invoice) {
            $coa = fn (string $code) => \App\Models\Account::where('company_id', $invoice->company_id)->where('code', $code)->firstOrFail();

            $entry = $this->createEntry($invoice->company_id, $invoice->issue_date, 'invoice', $invoice->id, "Invoice {$invoice->invoice_number}");

            if ($invoice->type === 'sales') {
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::ACCOUNTS_RECEIVABLE)->id, 'debit' => $invoice->total, 'credit' => 0, 'customer_id' => $invoice->customer_id]);
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::SALES_REVENUE)->id, 'debit' => 0, 'credit' => $invoice->subtotal - $invoice->discount_total]);
                if ($invoice->tax_total > 0) {
                    $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::VAT_PAYABLE)->id, 'debit' => 0, 'credit' => $invoice->tax_total]);
                }
            } else {
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::INVENTORY)->id, 'debit' => $invoice->subtotal - $invoice->discount_total, 'credit' => 0]);
                if ($invoice->tax_total > 0) {
                    $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::VAT_PAYABLE)->id, 'debit' => $invoice->tax_total, 'credit' => 0]);
                }
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::ACCOUNTS_PAYABLE)->id, 'debit' => 0, 'credit' => $invoice->total, 'supplier_id' => $invoice->supplier_id]);
            }

            return $this->finalizeAndTotal($entry);
        });
    }

    public function postPayment(Payment $payment): JournalEntry
    {
        return DB::transaction(function () use ($payment) {
            $coa = fn (string $code) => \App\Models\Account::where('company_id', $payment->company_id)->where('code', $code)->firstOrFail();
            $cashOrBank = $payment->bankAccount?->account_id ?? $coa(ChartOfAccountsSeeder::CASH)->id;

            $entry = $this->createEntry($payment->company_id, $payment->payment_date, 'payment', $payment->id, "Payment {$payment->payment_number}");

            if ($payment->direction === 'in') {
                $entry->lines()->create(['account_id' => $cashOrBank, 'debit' => $payment->amount, 'credit' => 0, 'customer_id' => $payment->customer_id]);
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::ACCOUNTS_RECEIVABLE)->id, 'debit' => 0, 'credit' => $payment->amount, 'customer_id' => $payment->customer_id]);
            } else {
                $entry->lines()->create(['account_id' => $coa(ChartOfAccountsSeeder::ACCOUNTS_PAYABLE)->id, 'debit' => $payment->amount, 'credit' => 0, 'supplier_id' => $payment->supplier_id]);
                $entry->lines()->create(['account_id' => $cashOrBank, 'debit' => 0, 'credit' => $payment->amount, 'supplier_id' => $payment->supplier_id]);
            }

            return $this->finalizeAndTotal($entry);
        });
    }

    public function postExpense(Expense $expense): JournalEntry
    {
        return DB::transaction(function () use ($expense) {
            $coa = fn (string $code) => \App\Models\Account::where('company_id', $expense->company_id)->where('code', $code)->firstOrFail();
            $cashOrBank = $expense->bankAccount?->account_id ?? $coa(ChartOfAccountsSeeder::CASH)->id;

            $entry = $this->createEntry($expense->company_id, $expense->expense_date, 'expense', $expense->id, "Expense {$expense->expense_number}");
            $entry->lines()->create(['account_id' => $expense->account_id, 'debit' => $expense->amount, 'credit' => 0, 'supplier_id' => $expense->supplier_id]);
            $entry->lines()->create(['account_id' => $cashOrBank, 'debit' => 0, 'credit' => $expense->amount]);

            return $this->finalizeAndTotal($entry);
        });
    }

    public function postRevenue(Revenue $revenue): JournalEntry
    {
        return DB::transaction(function () use ($revenue) {
            $coa = fn (string $code) => \App\Models\Account::where('company_id', $revenue->company_id)->where('code', $code)->firstOrFail();
            $cashOrBank = $revenue->bankAccount?->account_id ?? $coa(ChartOfAccountsSeeder::CASH)->id;

            $entry = $this->createEntry($revenue->company_id, $revenue->revenue_date, 'revenue', $revenue->id, "Revenue {$revenue->revenue_number}");
            $entry->lines()->create(['account_id' => $cashOrBank, 'debit' => $revenue->amount, 'credit' => 0, 'customer_id' => $revenue->customer_id]);
            $entry->lines()->create(['account_id' => $revenue->account_id, 'debit' => 0, 'credit' => $revenue->amount]);

            return $this->finalizeAndTotal($entry);
        });
    }

    public function postBankTransfer(BankTransfer $transfer): JournalEntry
    {
        return DB::transaction(function () use ($transfer) {
            $entry = $this->createEntry($transfer->company_id, $transfer->transfer_date, 'bank_transfer', $transfer->id, 'Bank transfer');
            $entry->lines()->create(['account_id' => $transfer->toBankAccount->account_id, 'debit' => $transfer->amount, 'credit' => 0]);
            $entry->lines()->create(['account_id' => $transfer->fromBankAccount->account_id, 'debit' => 0, 'credit' => $transfer->amount]);

            return $this->finalizeAndTotal($entry);
        });
    }

    private function createEntry(int $companyId, $date, string $sourceType, int $sourceId, string $description): JournalEntry
    {
        return JournalEntry::create([
            'company_id' => $companyId,
            'entry_number' => NumberGenerator::next(JournalEntry::query(), 'JE', $companyId),
            'entry_date' => $date,
            'description' => $description,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'status' => 'draft',
        ]);
    }

    private function finalizeAndTotal(JournalEntry $entry): JournalEntry
    {
        $entry->refresh();
        $entry->update([
            'total_debit' => $entry->lines()->sum('debit'),
            'total_credit' => $entry->lines()->sum('credit'),
            'status' => 'posted',
            'posted_at' => now(),
        ]);

        return $entry;
    }
}
