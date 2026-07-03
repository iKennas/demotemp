<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\JournalPostingService;
use App\Services\NumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $payments = Payment::query()
            ->when($request->direction, fn ($q) => $q->where('direction', $request->direction))
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->with('customer', 'supplier', 'invoice', 'bankAccount')
            ->orderByDesc('payment_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($payments);
    }

    public function store(Request $request, JournalPostingService $posting)
    {
        $data = $request->validate([
            'direction' => ['required', Rule::in(['in', 'out'])],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'bank_account_id' => ['nullable', 'exists:bank_accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'card', 'cheque', 'other'])],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = isset($data['invoice_id']) ? Invoice::findOrFail($data['invoice_id']) : null;

        if ($invoice && $data['amount'] > $invoice->balanceDue() + 0.01) {
            return response()->json(['message' => 'Payment amount exceeds the invoice balance due.'], 422);
        }

        $payment = DB::transaction(function () use ($data, $request, $invoice, $posting) {
            $payment = Payment::create([
                'payment_number' => NumberGenerator::next(Payment::query(), 'PAY', $request->user()->company_id),
                'direction' => $data['direction'],
                'customer_id' => $data['customer_id'] ?? $invoice?->customer_id,
                'supplier_id' => $data['supplier_id'] ?? $invoice?->supplier_id,
                'invoice_id' => $invoice?->id,
                'bank_account_id' => $data['bank_account_id'] ?? null,
                'amount' => $data['amount'],
                'payment_date' => $data['payment_date'],
                'method' => $data['method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $entry = $posting->postPayment($payment);
            $payment->update(['journal_entry_id' => $entry->id]);

            if ($invoice) {
                $paid = $invoice->paid_amount + $data['amount'];
                $invoice->update([
                    'paid_amount' => $paid,
                    'status' => $paid >= $invoice->total ? 'paid' : 'partially_paid',
                ]);
            }

            return $payment;
        });

        return response()->json(['data' => $payment], 201);
    }

    public function show(Payment $payment)
    {
        return response()->json(['data' => $payment->load('customer', 'supplier', 'invoice', 'bankAccount', 'journalEntry')]);
    }

    public function destroy(Payment $payment)
    {
        DB::transaction(function () use ($payment) {
            $payment->journalEntry?->update(['status' => 'void']);

            if ($payment->invoice) {
                $paid = max(0, $payment->invoice->paid_amount - $payment->amount);
                $payment->invoice->update([
                    'paid_amount' => $paid,
                    'status' => $paid <= 0 ? 'sent' : 'partially_paid',
                ]);
            }

            $payment->delete();
        });

        return response()->json(null, 204);
    }
}
