<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InvoiceMail;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use App\Services\InvoiceTotalsCalculator;
use App\Services\JournalPostingService;
use App\Services\NumberGenerator;
use App\Services\ZatcaQrCodeGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::query()
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->with('customer', 'supplier')
            ->orderByDesc('issue_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($invoices);
    }

    public function store(Request $request)
    {
        $data = $this->validateInvoice($request);

        $invoice = DB::transaction(function () use ($data, $request) {
            $totals = InvoiceTotalsCalculator::computeTotals($data['items']);

            $invoice = Invoice::create([
                'type' => $data['type'],
                'invoice_number' => NumberGenerator::next(Invoice::query(), $data['type'] === 'sales' ? 'INV' : 'PINV', $request->user()->company_id),
                'customer_id' => $data['customer_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'status' => 'draft',
                'currency' => $data['currency'] ?? 'SAR',
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discount_total'],
                'tax_total' => $totals['tax_total'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
                'is_recurring' => $data['is_recurring'] ?? false,
                'recurring_interval' => $data['recurring_interval'] ?? null,
            ]);

            foreach ($data['items'] as $order => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'] ?? 15,
                    'discount' => $item['discount'] ?? 0,
                    'line_total' => InvoiceTotalsCalculator::lineTotal($item),
                    'line_order' => $order,
                ]);
            }

            return $invoice;
        });

        return response()->json(['data' => $invoice->load('items')], 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json(['data' => $invoice->load('items.product', 'customer', 'supplier', 'payments'), 'balance_due' => $invoice->balanceDue()]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be edited.'], 422);
        }

        $data = $this->validateInvoice($request);

        DB::transaction(function () use ($data, $invoice) {
            $totals = InvoiceTotalsCalculator::computeTotals($data['items']);

            $invoice->update([
                'customer_id' => $data['customer_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discount_total'],
                'tax_total' => $totals['tax_total'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($data['items'] as $order => $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'] ?? 15,
                    'discount' => $item['discount'] ?? 0,
                    'line_total' => InvoiceTotalsCalculator::lineTotal($item),
                    'line_order' => $order,
                ]);
            }
        });

        return response()->json(['data' => $invoice->fresh('items')]);
    }

    public function destroy(Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be deleted.'], 422);
        }

        $invoice->delete();

        return response()->json(null, 204);
    }

    /**
     * Finalizes a draft invoice: posts the double-entry journal entry,
     * applies inventory movements for tracked products, generates the
     * ZATCA QR payload (sales invoices), and marks it sent.
     */
    public function send(Invoice $invoice, JournalPostingService $posting)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be sent.'], 422);
        }

        DB::transaction(function () use ($invoice, $posting) {
            $posting->postInvoice($invoice);

            foreach ($invoice->items()->whereNotNull('product_id')->with('product')->get() as $item) {
                if (! $item->product || ! $item->product->track_inventory) {
                    continue;
                }
                $type = $invoice->type === 'sales' ? 'out' : 'in';
                $item->product->inventoryMovements()->create([
                    'company_id' => $invoice->company_id,
                    'type' => $type,
                    'quantity' => $item->quantity,
                    'reference_type' => 'invoice',
                    'reference_id' => $invoice->id,
                    'movement_date' => $invoice->issue_date,
                ]);
                $item->product->increment('quantity_on_hand', $type === 'out' ? -$item->quantity : $item->quantity);
            }

            $updates = ['status' => 'sent', 'sent_at' => now()];

            if ($invoice->is_recurring && $invoice->recurring_interval) {
                $updates['next_recurrence_date'] = $invoice->nextRecurrenceDateFrom($invoice->issue_date);
            }

            if ($invoice->type === 'sales') {
                $updates['zatca_uuid'] = (string) \Illuminate\Support\Str::uuid();
                $updates['zatca_qr_code'] = ZatcaQrCodeGenerator::generate(
                    $invoice->company->name,
                    $invoice->company->tax_number ?? '',
                    now(),
                    (float) $invoice->total,
                    (float) $invoice->tax_total,
                );
            }

            $invoice->update($updates);
        });

        return response()->json(['data' => $invoice->fresh()]);
    }

    public function pdf(Invoice $invoice, InvoicePdfService $pdfService)
    {
        if ($invoice->status === 'draft') {
            return response()->json(['message' => 'Send the invoice before downloading its PDF.'], 422);
        }

        $pdfContent = $pdfService->render($invoice);

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$invoice->invoice_number}.pdf\"",
        ]);
    }

    public function email(Request $request, Invoice $invoice, InvoicePdfService $pdfService)
    {
        if ($invoice->status === 'draft') {
            return response()->json(['message' => 'Send the invoice before emailing it.'], 422);
        }

        $data = $request->validate(['to' => ['nullable', 'email']]);
        $party = $invoice->type === 'sales' ? $invoice->customer : $invoice->supplier;
        $recipient = $data['to'] ?? $party?->email;

        if (! $recipient) {
            return response()->json(['message' => 'No email address on file for this customer/supplier, and none was provided.'], 422);
        }

        $pdfContent = $pdfService->render($invoice);
        Mail::to($recipient)->send(new InvoiceMail($invoice, $pdfContent));

        return response()->json(['message' => "Invoice emailed to {$recipient}."]);
    }

    public function void(Invoice $invoice)
    {
        if ((float) $invoice->paid_amount > 0) {
            return response()->json(['message' => 'Invoice has payments recorded and cannot be voided.'], 422);
        }

        $invoice->update(['status' => 'void']);

        return response()->json(['data' => $invoice]);
    }

    private function validateInvoice(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['sales', 'purchase'])],
            'customer_id' => ['required_if:type,sales', 'nullable', 'exists:customers,id'],
            'supplier_id' => ['required_if:type,purchase', 'nullable', 'exists:suppliers,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:issue_date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'is_recurring' => ['nullable', 'boolean'],
            'recurring_interval' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

}
