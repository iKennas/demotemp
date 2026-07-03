<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpensesRevenuesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function registerCompany(): array
    {
        $token = $this->postJson('/api/auth/register', [
            'company_name' => 'Cash Flow Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@cashflowtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');

        $headers = ['Authorization' => "Bearer {$token}"];
        $accounts = $this->getJson('/api/accounts', $headers)->json('data');

        return [$headers, $accounts];
    }

    public function test_recording_an_expense_posts_a_balanced_journal_entry_and_reduces_cash(): void
    {
        [$headers, $accounts] = $this->registerCompany();
        $expenseAccount = collect($accounts)->firstWhere('code', '5900');
        $cashAccount = collect($accounts)->firstWhere('code', '1000');

        $this->postJson('/api/expenses', [
            'account_id' => $expenseAccount['id'],
            'amount' => 250,
            'expense_date' => now()->toDateString(),
            'category' => 'Office Supplies',
        ], $headers)->assertCreated();

        $trialBalance = $this->getJson('/api/reports/trial-balance', $headers)->assertOk()->json();
        $this->assertEquals($trialBalance['total_debit'], $trialBalance['total_credit']);

        $ledger = $this->getJson("/api/reports/general-ledger/{$cashAccount['id']}", $headers)->assertOk()->json();
        $this->assertEquals(-250.0, (float) $ledger['data'][0]['running_balance']);
    }

    public function test_recording_a_revenue_posts_a_balanced_journal_entry_and_increases_cash(): void
    {
        [$headers, $accounts] = $this->registerCompany();
        $revenueAccount = collect($accounts)->firstWhere('code', '4000');
        $cashAccount = collect($accounts)->firstWhere('code', '1000');

        $this->postJson('/api/revenues', [
            'account_id' => $revenueAccount['id'],
            'amount' => 400,
            'revenue_date' => now()->toDateString(),
            'category' => 'Consulting',
        ], $headers)->assertCreated();

        $pl = $this->getJson('/api/reports/profit-and-loss', $headers)->assertOk()->json();
        $this->assertEquals(400.0, $pl['net_income']);

        $ledger = $this->getJson("/api/reports/general-ledger/{$cashAccount['id']}", $headers)->assertOk()->json();
        $this->assertEquals(400.0, (float) $ledger['data'][0]['running_balance']);
    }

    public function test_deleting_an_expense_voids_its_journal_entry(): void
    {
        [$headers, $accounts] = $this->registerCompany();
        $expenseAccount = collect($accounts)->firstWhere('code', '5900');

        $expense = $this->postJson('/api/expenses', [
            'account_id' => $expenseAccount['id'],
            'amount' => 100,
            'expense_date' => now()->toDateString(),
        ], $headers)->assertCreated()->json('data');

        $this->deleteJson("/api/expenses/{$expense['id']}", [], $headers)->assertNoContent();

        $trialBalance = $this->getJson('/api/reports/trial-balance', $headers)->assertOk()->json();
        // Voided entries are excluded from the trial balance entirely.
        $this->assertEquals(0.0, $trialBalance['total_debit']);
        $this->assertEquals(0.0, $trialBalance['total_credit']);
    }
}
