<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\JournalEntryLine;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * One consolidated payload for the dashboard, so the frontend doesn't
     * have to fan out to half a dozen endpoints on load. Each section is
     * only included if the user actually has permission to see it.
     */
    public function summary(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $data = [];

        if ($user->can('finance.view')) {
            $data['monthly_trend'] = $this->monthlyTrend($companyId);
        }

        if ($user->can('invoices.view')) {
            $data['recent_invoices'] = Invoice::with('customer', 'supplier')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'invoice_number', 'type', 'customer_id', 'supplier_id', 'status', 'total', 'issue_date']);

            $overdue = Invoice::where('status', 'overdue')->orderBy('due_date');
            $data['overdue_invoices'] = [
                'count' => $overdue->count(),
                'total' => (float) $overdue->clone()->sum('total'),
                'data' => $overdue->clone()->with('customer')->limit(5)->get(['id', 'invoice_number', 'customer_id', 'due_date', 'total']),
            ];
        }

        if ($user->can('cash.view')) {
            $data['recent_payments'] = \App\Models\Payment::with('customer', 'supplier')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'payment_number', 'direction', 'customer_id', 'supplier_id', 'amount', 'payment_date']);
        }

        if ($user->can('inventory.view')) {
            $lowStock = Product::where('track_inventory', true)
                ->whereNotNull('reorder_level')
                ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
                ->where('is_active', true);
            $data['low_stock'] = [
                'count' => $lowStock->count(),
                'data' => $lowStock->clone()->limit(5)->get(['id', 'name', 'sku', 'quantity_on_hand', 'reorder_level']),
            ];
        }

        return response()->json($data);
    }

    private function monthlyTrend(int $companyId, int $months = 6): array
    {
        $from = Carbon::now()->subMonths($months - 1)->startOfMonth();

        $lines = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->join('accounts', 'accounts.id', '=', 'journal_entry_lines.account_id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'posted')
            ->whereIn('accounts.type', ['revenue', 'expense'])
            ->where('journal_entries.entry_date', '>=', $from)
            ->get(['journal_entries.entry_date', 'accounts.type', 'journal_entry_lines.debit', 'journal_entry_lines.credit']);

        // Plain array, not a Collection: mutating a nested array through
        // Collection offsetGet/offsetSet doesn't persist (it operates on a
        // copy), so `$buckets[$key]['revenue'] += ...` would silently no-op.
        $buckets = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $key = Carbon::now()->subMonths($i)->format('Y-m');
            $buckets[$key] = ['month' => $key, 'revenue' => 0.0, 'expense' => 0.0];
        }

        foreach ($lines as $line) {
            $key = Carbon::parse($line->entry_date)->format('Y-m');
            if (! isset($buckets[$key])) {
                continue;
            }
            if ($line->type === 'revenue') {
                $buckets[$key]['revenue'] += (float) $line->credit - (float) $line->debit;
            } else {
                $buckets[$key]['expense'] += (float) $line->debit - (float) $line->credit;
            }
        }

        return array_values(array_map(fn ($b) => [
            'month' => $b['month'],
            'revenue' => round($b['revenue'], 2),
            'expense' => round($b['expense'], 2),
            'net' => round($b['revenue'] - $b['expense'], 2),
        ], $buckets));
    }
}
