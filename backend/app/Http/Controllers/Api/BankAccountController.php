<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\BankAccount;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    public function index()
    {
        return response()->json(['data' => BankAccount::orderBy('bank_name')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'account_name' => ['required', 'string', 'max:255'],
            'bank_name' => ['required', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'size:3'],
            'opening_balance' => ['nullable', 'numeric'],
        ]);

        // Every bank account gets its own asset ledger account, named to match,
        // so postings (payments, transfers) always have a concrete COA target.
        // Codes 1300-1399 are reserved for bank accounts.
        $nextSeq = Account::where('company_id', $request->user()->company_id)
            ->where('code', 'like', '13%')->count() + 1;
        $ledgerAccount = Account::create([
            'company_id' => $request->user()->company_id,
            'code' => '13'.str_pad((string) $nextSeq, 2, '0', STR_PAD_LEFT),
            'name' => $data['account_name'],
            'type' => 'asset',
            'normal_balance' => 'debit',
            'currency' => $data['currency'] ?? 'SAR',
            'opening_balance' => $data['opening_balance'] ?? 0,
            'is_system' => true,
        ]);

        $bankAccount = BankAccount::create($data + ['account_id' => $ledgerAccount->id]);

        return response()->json(['data' => $bankAccount], 201);
    }

    public function show(BankAccount $bankAccount)
    {
        return response()->json(['data' => $bankAccount->load('account'), 'balance' => $bankAccount->account->balance()]);
    }

    public function update(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'account_name' => ['sometimes', 'string', 'max:255'],
            'bank_name' => ['sometimes', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $bankAccount->update($data);

        return response()->json(['data' => $bankAccount]);
    }

    public function destroy(BankAccount $bankAccount)
    {
        if ($bankAccount->account->journalEntryLines()->exists()) {
            return response()->json(['message' => 'Bank account has posted transactions and cannot be deleted.'], 422);
        }

        $bankAccount->delete();

        return response()->json(null, 204);
    }
}
