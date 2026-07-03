<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function registerCompany(): string
    {
        $response = $this->postJson('/api/auth/register', [
            'company_name' => 'Test Trading Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@flowtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ]);
        $response->assertCreated();

        return $response->json('token');
    }

    public function test_full_invoice_to_payment_flow_produces_a_balanced_ledger(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        // Chart of accounts auto-seeded on registration.
        $this->getJson('/api/accounts', $headers)
            ->assertOk()
            ->assertJsonCount(10, 'data');

        $customer = $this->postJson('/api/customers', ['name' => 'Acme Client'], $headers)
            ->assertCreated()
            ->json('data');

        $product = $this->postJson('/api/products', [
            'name' => 'Widget', 'sale_price' => 100, 'tax_rate' => 15,
            'track_inventory' => true, 'quantity_on_hand' => 50,
        ], $headers)->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'items' => [
                ['product_id' => $product['id'], 'description' => 'Widget x2', 'quantity' => 2, 'unit_price' => 100, 'tax_rate' => 15],
            ],
        ], $headers)->assertCreated()->json('data');

        $this->assertEquals(200.0, (float) $invoice['subtotal']);
        $this->assertEquals(30.0, (float) $invoice['tax_total']);
        $this->assertEquals(230.0, (float) $invoice['total']);

        $sent = $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)
            ->assertOk()
            ->json('data');
        $this->assertEquals('sent', $sent['status']);
        $this->assertNotNull($sent['zatca_qr_code']);

        // Inventory decremented.
        $this->getJson("/api/products/{$product['id']}", $headers)
            ->assertOk()
            ->assertJsonPath('data.quantity_on_hand', '48.000');

        $this->postJson('/api/payments', [
            'direction' => 'in',
            'invoice_id' => $invoice['id'],
            'amount' => 230,
            'payment_date' => now()->toDateString(),
            'method' => 'cash',
        ], $headers)->assertCreated();

        // Trial balance must always balance.
        $trialBalance = $this->getJson('/api/reports/trial-balance', $headers)->assertOk()->json();
        $this->assertEquals($trialBalance['total_debit'], $trialBalance['total_credit']);
        $this->assertEquals(460.0, $trialBalance['total_debit']);

        // Net income excludes VAT.
        $pl = $this->getJson('/api/reports/profit-and-loss', $headers)->assertOk()->json();
        $this->assertEquals(200.0, $pl['net_income']);

        // Balance sheet: Assets = Liabilities + Equity.
        $bs = $this->getJson('/api/reports/balance-sheet', $headers)->assertOk()->json();
        $this->assertEqualsWithDelta($bs['total_assets'], $bs['total_liabilities'] + $bs['total_equity'], 0.01);
    }

    public function test_journal_entry_must_balance_before_it_can_be_posted(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $accounts = $this->getJson('/api/accounts', $headers)->json('data');
        $cash = collect($accounts)->firstWhere('code', '1000');
        $equity = collect($accounts)->firstWhere('code', '3000');

        // Unbalanced entry is rejected outright.
        $this->postJson('/api/journal-entries', [
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash['id'], 'debit' => 100, 'credit' => 0],
                ['account_id' => $equity['id'], 'debit' => 0, 'credit' => 50],
            ],
        ], $headers)->assertStatus(422);

        // Balanced entry succeeds as a draft, then can be posted.
        $entry = $this->postJson('/api/journal-entries', [
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash['id'], 'debit' => 100, 'credit' => 0],
                ['account_id' => $equity['id'], 'debit' => 0, 'credit' => 100],
            ],
        ], $headers)->assertCreated()->json('data');

        $this->assertEquals('draft', $entry['status']);

        $this->postJson("/api/journal-entries/{$entry['id']}/post", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'posted');
    }
}
