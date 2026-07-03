<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntryLine;
use App\Services\PdfLogoResolver;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Joins journal_entries manually, so it must re-apply the company scope
     * explicitly - JournalEntry's BelongsToCompany global scope only
     * auto-applies to queries built via the JournalEntry model itself.
     */
    private function postedLines(Request $request)
    {
        return JournalEntryLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entries.company_id', $request->user()->company_id)
            ->where('journal_entries.status', 'posted')
            ->when($request->from, fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $request->from))
            ->when($request->to, fn ($q) => $q->whereDate('journal_entries.entry_date', '<=', $request->to));
    }

    private function trialBalanceData(Request $request): array
    {
        $sums = $this->postedLines($request)
            ->selectRaw('journal_entry_lines.account_id, SUM(journal_entry_lines.debit) as debit, SUM(journal_entry_lines.credit) as credit')
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = Account::orderBy('code')->get()->map(function (Account $account) use ($sums) {
            $debit = (float) ($sums[$account->id]->debit ?? 0);
            $credit = (float) ($sums[$account->id]->credit ?? 0);

            return [
                'account_id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'debit' => $debit,
                'credit' => $credit,
            ];
        })->filter(fn ($row) => $row['debit'] != 0 || $row['credit'] != 0)->values();

        return [
            'accounts' => $accounts,
            'total_debit' => $accounts->sum('debit'),
            'total_credit' => $accounts->sum('credit'),
        ];
    }

    public function trialBalance(Request $request)
    {
        $data = $this->trialBalanceData($request);

        return response()->json([
            'data' => $data['accounts'],
            'total_debit' => $data['total_debit'],
            'total_credit' => $data['total_credit'],
        ]);
    }

    public function trialBalancePdf(Request $request)
    {
        $data = $this->trialBalanceData($request);

        $pdf = Pdf::loadView('pdf.trial-balance', [
            'company' => $request->user()->company,
            'logoPath' => PdfLogoResolver::resolve($request->user()->company),
            'accounts' => $data['accounts'],
            'totalDebit' => $data['total_debit'],
            'totalCredit' => $data['total_credit'],
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="trial-balance.pdf"',
        ]);
    }

    public function generalLedger(Request $request, Account $account)
    {
        $lines = $this->postedLines($request)
            ->where('journal_entry_lines.account_id', $account->id)
            ->orderBy('journal_entries.entry_date')
            ->get([
                'journal_entry_lines.id', 'journal_entries.entry_date', 'journal_entries.entry_number',
                'journal_entries.description as entry_description', 'journal_entry_lines.description as line_description',
                'journal_entry_lines.debit', 'journal_entry_lines.credit',
            ]);

        $running = 0;
        $lines = $lines->map(function ($line) use (&$running, $account) {
            $delta = $account->normal_balance === 'debit'
                ? $line->debit - $line->credit
                : $line->credit - $line->debit;
            $running += $delta;
            $line->running_balance = $running;

            return $line;
        });

        return response()->json(['data' => $lines, 'account' => $account]);
    }

    private function profitAndLossData(Request $request): array
    {
        $sums = $this->postedLines($request)
            ->join('accounts', 'accounts.id', '=', 'journal_entry_lines.account_id')
            ->whereIn('accounts.type', ['revenue', 'expense'])
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.type, SUM(journal_entry_lines.debit) as debit, SUM(journal_entry_lines.credit) as credit')
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.type')
            ->get();

        $revenue = $sums->where('type', 'revenue')->map(fn ($r) => ['code' => $r->code, 'name' => $r->name, 'amount' => (float) $r->credit - (float) $r->debit]);
        $expenses = $sums->where('type', 'expense')->map(fn ($r) => ['code' => $r->code, 'name' => $r->name, 'amount' => (float) $r->debit - (float) $r->credit]);

        $totalRevenue = $revenue->sum('amount');
        $totalExpenses = $expenses->sum('amount');

        return [
            'revenue' => $revenue->values(),
            'expenses' => $expenses->values(),
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'net_income' => $totalRevenue - $totalExpenses,
        ];
    }

    public function profitAndLoss(Request $request)
    {
        return response()->json($this->profitAndLossData($request));
    }

    public function profitAndLossPdf(Request $request)
    {
        $data = $this->profitAndLossData($request);

        $pdf = Pdf::loadView('pdf.profit-and-loss', [
            'company' => $request->user()->company,
            'logoPath' => PdfLogoResolver::resolve($request->user()->company),
            'revenue' => $data['revenue'],
            'expenses' => $data['expenses'],
            'totalRevenue' => $data['total_revenue'],
            'totalExpenses' => $data['total_expenses'],
            'netIncome' => $data['net_income'],
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="profit-and-loss.pdf"',
        ]);
    }

    private function balanceSheetData(Request $request): array
    {
        $sums = $this->postedLines($request)
            ->join('accounts', 'accounts.id', '=', 'journal_entry_lines.account_id')
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.type, accounts.normal_balance, SUM(journal_entry_lines.debit) as debit, SUM(journal_entry_lines.credit) as credit')
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.type', 'accounts.normal_balance')
            ->get();

        $balanceOf = fn ($row) => $row->normal_balance === 'debit' ? (float) $row->debit - (float) $row->credit : (float) $row->credit - (float) $row->debit;

        $assets = $sums->where('type', 'asset')->map(fn ($r) => ['code' => $r->code, 'name' => $r->name, 'amount' => $balanceOf($r)]);
        $liabilities = $sums->where('type', 'liability')->map(fn ($r) => ['code' => $r->code, 'name' => $r->name, 'amount' => $balanceOf($r)]);
        $equity = $sums->where('type', 'equity')->map(fn ($r) => ['code' => $r->code, 'name' => $r->name, 'amount' => $balanceOf($r)]);

        $netIncome = $sums->whereIn('type', ['revenue', 'expense'])->sum(function ($r) {
            return $r->type === 'revenue' ? ((float) $r->credit - (float) $r->debit) : -((float) $r->debit - (float) $r->credit);
        });

        return [
            'assets' => $assets->values(),
            'liabilities' => $liabilities->values(),
            'equity' => $equity->values(),
            'net_income' => $netIncome,
            'total_assets' => $assets->sum('amount'),
            'total_liabilities' => $liabilities->sum('amount'),
            'total_equity' => $equity->sum('amount') + $netIncome,
        ];
    }

    public function balanceSheet(Request $request)
    {
        return response()->json($this->balanceSheetData($request));
    }

    public function balanceSheetPdf(Request $request)
    {
        $data = $this->balanceSheetData($request);

        $pdf = Pdf::loadView('pdf.balance-sheet', [
            'company' => $request->user()->company,
            'logoPath' => PdfLogoResolver::resolve($request->user()->company),
            'assets' => $data['assets'],
            'liabilities' => $data['liabilities'],
            'equity' => $data['equity'],
            'netIncome' => $data['net_income'],
            'totalAssets' => $data['total_assets'],
            'totalLiabilities' => $data['total_liabilities'],
            'totalEquity' => $data['total_equity'],
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="balance-sheet.pdf"',
        ]);
    }
}
