<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\PdfLogoResolver;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return response()->json($customers);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('customers')->where('company_id', $request->user()->company_id)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(['individual', 'company'])],
            'classification' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'opening_balance' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
        ]);

        $customer = Customer::create($data);

        return response()->json(['data' => $customer], 201);
    }

    public function show(Customer $customer)
    {
        return response()->json(['data' => $customer->loadCount('invoices'), 'outstanding_balance' => $customer->outstandingBalance()]);
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('customers')->where('company_id', $request->user()->company_id)->ignore($customer->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(['individual', 'company'])],
            'classification' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string'],
        ]);

        $customer->update($data);

        return response()->json(['data' => $customer]);
    }

    public function destroy(Customer $customer)
    {
        if ($customer->invoices()->exists()) {
            return response()->json(['message' => 'Customer has invoices and cannot be deleted.'], 422);
        }

        $customer->delete();

        return response()->json(null, 204);
    }

    /**
     * Chronological statement of account: sales invoices (charges) and
     * payments (credits) merged with a running balance, seeded from the
     * customer's opening balance.
     */
    public function statement(Customer $customer)
    {
        $result = $this->statementData($customer);

        return response()->json([
            'data' => $result['lines'],
            'opening_balance' => $result['opening_balance'],
            'closing_balance' => $result['closing_balance'],
        ]);
    }

    public function statementPdf(Request $request, Customer $customer)
    {
        $result = $this->statementData($customer);

        $pdf = Pdf::loadView('pdf.statement', [
            'company' => $request->user()->company,
            'logoPath' => PdfLogoResolver::resolve($request->user()->company),
            'party' => $customer,
            'lines' => $result['lines'],
            'openingBalance' => $result['opening_balance'],
            'closingBalance' => $result['closing_balance'],
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"statement-{$customer->id}.pdf\"",
        ]);
    }

    private function statementData(Customer $customer): array
    {
        $invoices = $customer->invoices()
            ->where('type', 'sales')
            ->whereIn('status', ['sent', 'partially_paid', 'paid', 'overdue'])
            ->get()
            ->map(fn ($inv) => [
                'date' => $inv->issue_date,
                'type' => 'invoice',
                'reference' => $inv->invoice_number,
                'amount' => (float) $inv->total,
            ]);

        $payments = $customer->payments()
            ->where('direction', 'in')
            ->get()
            ->map(fn ($p) => [
                'date' => $p->payment_date,
                'type' => 'payment',
                'reference' => $p->payment_number,
                'amount' => -(float) $p->amount,
            ]);

        $lines = $invoices->concat($payments)->sortBy('date')->values();

        $running = (float) $customer->opening_balance;
        $lines = $lines->map(function ($line) use (&$running) {
            $running += $line['amount'];
            $line['balance'] = $running;

            return $line;
        });

        return [
            'lines' => $lines,
            'opening_balance' => (float) $customer->opening_balance,
            'closing_balance' => $running,
        ];
    }
}
