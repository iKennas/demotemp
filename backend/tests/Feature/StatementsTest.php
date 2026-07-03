<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatementsTest extends TestCase
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
        return $this->postJson('/api/auth/register', [
            'company_name' => 'Statement Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@statementtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

    public function test_customer_statement_reflects_invoices_and_payments_with_a_running_balance(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'Statement Client'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'items' => [['description' => 'Service', 'quantity' => 1, 'unit_price' => 1000, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)->assertOk();

        $this->postJson('/api/payments', [
            'direction' => 'in', 'invoice_id' => $invoice['id'],
            'amount' => 600, 'payment_date' => now()->toDateString(), 'method' => 'cash',
        ], $headers)->assertCreated();

        $statement = $this->getJson("/api/customers/{$customer['id']}/statement", $headers)
            ->assertOk()->json();

        $this->assertEquals(0, $statement['opening_balance']);
        $this->assertCount(2, $statement['data']);
        $this->assertEquals('invoice', $statement['data'][0]['type']);
        $this->assertEquals(1150.0, $statement['data'][0]['amount']);
        $this->assertEquals(1150.0, $statement['data'][0]['balance']);
        $this->assertEquals('payment', $statement['data'][1]['type']);
        $this->assertEquals(-600.0, $statement['data'][1]['amount']);
        $this->assertEquals(550.0, $statement['data'][1]['balance']);
        $this->assertEquals(550.0, $statement['closing_balance']);
    }

    public function test_supplier_statement_reflects_purchase_invoices_and_payments(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $supplier = $this->postJson('/api/suppliers', ['name' => 'Statement Supplier'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'purchase',
            'supplier_id' => $supplier['id'],
            'issue_date' => now()->toDateString(),
            'items' => [['description' => 'Stock purchase', 'quantity' => 1, 'unit_price' => 2000, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)->assertOk();

        $statement = $this->getJson("/api/suppliers/{$supplier['id']}/statement", $headers)
            ->assertOk()->json();

        $this->assertCount(1, $statement['data']);
        $this->assertEquals(2300.0, $statement['closing_balance']);
    }
}
