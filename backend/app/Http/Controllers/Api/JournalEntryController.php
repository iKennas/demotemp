<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\NumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $entries = JournalEntry::query()
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->from, fn ($q) => $q->whereDate('entry_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('entry_date', '<=', $request->to))
            ->with('lines.account')
            ->orderByDesc('entry_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json($entries);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'entry_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'exists:accounts,id'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.description' => ['nullable', 'string'],
        ]);

        $totalDebit = collect($data['lines'])->sum(fn ($l) => (float) ($l['debit'] ?? 0));
        $totalCredit = collect($data['lines'])->sum(fn ($l) => (float) ($l['credit'] ?? 0));

        if (round($totalDebit, 2) !== round($totalCredit, 2)) {
            return response()->json(['message' => 'Journal entry is not balanced: total debit must equal total credit.'], 422);
        }

        $entry = DB::transaction(function () use ($data, $request, $totalDebit, $totalCredit) {
            $entryNumber = NumberGenerator::next(JournalEntry::query(), 'JE', $request->user()->company_id);

            $entry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'entry_date' => $data['entry_date'],
                'reference' => $data['reference'] ?? null,
                'description' => $data['description'] ?? null,
                'source_type' => 'manual',
                'status' => 'draft',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $order => $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'description' => $line['description'] ?? null,
                    'line_order' => $order,
                ]);
            }

            return $entry;
        });

        return response()->json(['data' => $entry->load('lines.account')], 201);
    }

    public function show(JournalEntry $journalEntry)
    {
        return response()->json(['data' => $journalEntry->load('lines.account', 'creator')]);
    }

    public function update(Request $request, JournalEntry $journalEntry)
    {
        if ($journalEntry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries can be edited.'], 422);
        }

        $data = $request->validate([
            'entry_date' => ['sometimes', 'date'],
            'reference' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $journalEntry->update($data);

        return response()->json(['data' => $journalEntry]);
    }

    public function destroy(JournalEntry $journalEntry)
    {
        if ($journalEntry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries can be deleted.'], 422);
        }

        $journalEntry->delete();

        return response()->json(null, 204);
    }

    public function post(JournalEntry $journalEntry)
    {
        if ($journalEntry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries can be posted.'], 422);
        }

        if (! $journalEntry->isBalanced()) {
            return response()->json(['message' => 'Journal entry is not balanced.'], 422);
        }

        $journalEntry->update(['status' => 'posted', 'posted_at' => now()]);

        return response()->json(['data' => $journalEntry]);
    }

    public function void(JournalEntry $journalEntry)
    {
        if ($journalEntry->status !== 'posted') {
            return response()->json(['message' => 'Only posted entries can be voided.'], 422);
        }

        $journalEntry->update(['status' => 'void']);

        return response()->json(['data' => $journalEntry]);
    }
}
