<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Revenue;
use App\Services\JournalPostingService;
use App\Services\NumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RevenueController extends Controller
{
    public function index(Request $request)
    {
        $revenues = Revenue::query()
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->when($request->from, fn ($q) => $q->whereDate('revenue_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('revenue_date', '<=', $request->to))
            ->with('account', 'customer', 'bankAccount')
            ->orderByDesc('revenue_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($revenues);
    }

    public function store(Request $request, JournalPostingService $posting)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'account_id' => ['required', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'revenue_date' => ['required', 'date'],
            'payment_method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'card', 'cheque', 'other'])],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'bank_account_id' => ['nullable', 'exists:bank_accounts,id'],
            'description' => ['nullable', 'string'],
        ]);

        $revenue = DB::transaction(function () use ($data, $request, $posting) {
            $revenue = Revenue::create([
                'revenue_number' => NumberGenerator::next(Revenue::query(), 'REV', $request->user()->company_id),
                'category' => $data['category'] ?? null,
                'account_id' => $data['account_id'],
                'amount' => $data['amount'],
                'revenue_date' => $data['revenue_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'customer_id' => $data['customer_id'] ?? null,
                'bank_account_id' => $data['bank_account_id'] ?? null,
                'description' => $data['description'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $entry = $posting->postRevenue($revenue);
            $revenue->update(['journal_entry_id' => $entry->id]);

            return $revenue;
        });

        return response()->json(['data' => $revenue], 201);
    }

    public function show(Revenue $revenue)
    {
        return response()->json(['data' => $revenue->load('account', 'customer', 'bankAccount', 'journalEntry')]);
    }

    public function destroy(Revenue $revenue)
    {
        $revenue->journalEntry?->update(['status' => 'void']);
        $revenue->delete();

        return response()->json(null, 204);
    }
}
