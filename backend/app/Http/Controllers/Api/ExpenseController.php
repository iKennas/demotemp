<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\JournalPostingService;
use App\Services\NumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $expenses = Expense::query()
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->when($request->from, fn ($q) => $q->whereDate('expense_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('expense_date', '<=', $request->to))
            ->with('account', 'supplier', 'bankAccount')
            ->orderByDesc('expense_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($expenses);
    }

    public function store(Request $request, JournalPostingService $posting)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'account_id' => ['required', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'payment_method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'card', 'cheque', 'other'])],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'bank_account_id' => ['nullable', 'exists:bank_accounts,id'],
            'description' => ['nullable', 'string'],
        ]);

        $expense = DB::transaction(function () use ($data, $request, $posting) {
            $expense = Expense::create([
                'expense_number' => NumberGenerator::next(Expense::query(), 'EXP', $request->user()->company_id),
                'category' => $data['category'] ?? null,
                'account_id' => $data['account_id'],
                'amount' => $data['amount'],
                'expense_date' => $data['expense_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'supplier_id' => $data['supplier_id'] ?? null,
                'bank_account_id' => $data['bank_account_id'] ?? null,
                'description' => $data['description'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $entry = $posting->postExpense($expense);
            $expense->update(['journal_entry_id' => $entry->id]);

            return $expense;
        });

        return response()->json(['data' => $expense], 201);
    }

    public function show(Expense $expense)
    {
        return response()->json(['data' => $expense->load('account', 'supplier', 'bankAccount', 'journalEntry')]);
    }

    public function destroy(Expense $expense)
    {
        $expense->journalEntry?->update(['status' => 'void']);
        $expense->delete();

        return response()->json(null, 204);
    }
}
