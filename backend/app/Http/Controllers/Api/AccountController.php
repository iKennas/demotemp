<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $accounts = Account::query()
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('accounts')->where('company_id', $request->user()->company_id)],
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in(['asset', 'liability', 'equity', 'revenue', 'expense'])],
            'subtype' => ['nullable', 'string', 'max:100'],
            'normal_balance' => ['required', Rule::in(['debit', 'credit'])],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'currency' => ['nullable', 'string', 'size:3'],
            'opening_balance' => ['nullable', 'numeric'],
            'description' => ['nullable', 'string'],
        ]);

        $account = Account::create($data);

        return response()->json(['data' => $account], 201);
    }

    public function show(Account $account)
    {
        return response()->json(['data' => $account->load('children')]);
    }

    public function update(Request $request, Account $account)
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('accounts')->where('company_id', $request->user()->company_id)->ignore($account->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'subtype' => ['nullable', 'string', 'max:100'],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($account->is_system && array_key_exists('code', $data)) {
            return response()->json(['message' => 'System accounts cannot be recoded.'], 422);
        }

        $account->update($data);

        return response()->json(['data' => $account]);
    }

    public function destroy(Account $account)
    {
        if ($account->is_system) {
            return response()->json(['message' => 'System accounts cannot be deleted.'], 422);
        }

        if ($account->journalEntryLines()->exists()) {
            return response()->json(['message' => 'Account has posted transactions and cannot be deleted.'], 422);
        }

        $account->delete();

        return response()->json(null, 204);
    }
}
