<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankTransfer;
use App\Services\JournalPostingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BankTransferController extends Controller
{
    public function index(Request $request)
    {
        $transfers = BankTransfer::query()
            ->with('fromBankAccount', 'toBankAccount')
            ->orderByDesc('transfer_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($transfers);
    }

    public function store(Request $request, JournalPostingService $posting)
    {
        $data = $request->validate([
            'from_bank_account_id' => ['required', 'exists:bank_accounts,id', 'different:to_bank_account_id'],
            'to_bank_account_id' => ['required', 'exists:bank_accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transfer_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $transfer = DB::transaction(function () use ($data, $request, $posting) {
            $transfer = BankTransfer::create($data + ['created_by' => $request->user()->id]);
            $entry = $posting->postBankTransfer($transfer);
            $transfer->update(['journal_entry_id' => $entry->id]);

            return $transfer;
        });

        return response()->json(['data' => $transfer], 201);
    }

    public function show(BankTransfer $bankTransfer)
    {
        return response()->json(['data' => $bankTransfer->load('fromBankAccount', 'toBankAccount', 'journalEntry')]);
    }

    public function destroy(BankTransfer $bankTransfer)
    {
        $bankTransfer->journalEntry?->update(['status' => 'void']);
        $bankTransfer->delete();

        return response()->json(null, 204);
    }
}
