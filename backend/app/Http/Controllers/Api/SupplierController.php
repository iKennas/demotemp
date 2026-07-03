<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\PdfLogoResolver;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return response()->json($suppliers);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('suppliers')->where('company_id', $request->user()->company_id)],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2'],
            'opening_balance' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
        ]);

        $supplier = Supplier::create($data);

        return response()->json(['data' => $supplier], 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json(['data' => $supplier->loadCount('invoices')]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('suppliers')->where('company_id', $request->user()->company_id)->ignore($supplier->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string'],
        ]);

        $supplier->update($data);

        return response()->json(['data' => $supplier]);
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->invoices()->exists()) {
            return response()->json(['message' => 'Supplier has invoices and cannot be deleted.'], 422);
        }

        $supplier->delete();

        return response()->json(null, 204);
    }

    /**
     * Chronological statement of account: purchase invoices (charges) and
     * payments (credits) merged with a running balance, seeded from the
     * supplier's opening balance.
     */
    public function statement(Supplier $supplier)
    {
        $result = $this->statementData($supplier);

        return response()->json([
            'data' => $result['lines'],
            'opening_balance' => $result['opening_balance'],
            'closing_balance' => $result['closing_balance'],
        ]);
    }

    public function statementPdf(Request $request, Supplier $supplier)
    {
        $result = $this->statementData($supplier);

        $pdf = Pdf::loadView('pdf.statement', [
            'company' => $request->user()->company,
            'logoPath' => PdfLogoResolver::resolve($request->user()->company),
            'party' => $supplier,
            'lines' => $result['lines'],
            'openingBalance' => $result['opening_balance'],
            'closingBalance' => $result['closing_balance'],
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"statement-{$supplier->id}.pdf\"",
        ]);
    }

    private function statementData(Supplier $supplier): array
    {
        $invoices = $supplier->invoices()
            ->where('type', 'purchase')
            ->whereIn('status', ['sent', 'partially_paid', 'paid', 'overdue'])
            ->get()
            ->map(fn ($inv) => [
                'date' => $inv->issue_date,
                'type' => 'invoice',
                'reference' => $inv->invoice_number,
                'amount' => (float) $inv->total,
            ]);

        $payments = $supplier->payments()
            ->where('direction', 'out')
            ->get()
            ->map(fn ($p) => [
                'date' => $p->payment_date,
                'type' => 'payment',
                'reference' => $p->payment_number,
                'amount' => -(float) $p->amount,
            ]);

        $lines = $invoices->concat($payments)->sortBy('date')->values();

        $running = (float) $supplier->opening_balance;
        $lines = $lines->map(function ($line) use (&$running) {
            $running += $line['amount'];
            $line['balance'] = $running;

            return $line;
        });

        return [
            'lines' => $lines,
            'opening_balance' => (float) $supplier->opening_balance,
            'closing_balance' => $running,
        ];
    }
}
