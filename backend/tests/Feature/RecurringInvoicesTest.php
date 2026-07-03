<?php

namespace Tests\Feature;

use App\Console\Commands\GenerateRecurringInvoices;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringInvoicesTest extends TestCase
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
            'company_name' => 'Recurring Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@recurtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

    public function test_sending_a_recurring_invoice_sets_next_recurrence_date(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'Retainer Client'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'is_recurring' => true,
            'recurring_interval' => 'monthly',
            'items' => [['description' => 'Retainer', 'quantity' => 1, 'unit_price' => 1000, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $sent = $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)
            ->assertOk()->json('data');

        $this->assertNotNull($sent['next_recurrence_date']);
        $this->assertEquals(
            now()->addMonth()->toDateString(),
            substr($sent['next_recurrence_date'], 0, 10),
        );
    }

    public function test_generate_recurring_invoices_command_creates_the_next_occurrence_when_due(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'Retainer Client'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'is_recurring' => true,
            'recurring_interval' => 'monthly',
            'items' => [['description' => 'Retainer', 'quantity' => 1, 'unit_price' => 1000, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)->assertOk();

        // Not due yet - command should do nothing.
        $this->artisan('invoices:generate-recurring')->assertExitCode(0);
        $this->assertEquals(1, Invoice::withoutGlobalScopes()->count());

        // Backdate to make it due, then run again.
        Invoice::withoutGlobalScopes()->first()->update(['next_recurrence_date' => now()->toDateString()]);
        $this->artisan('invoices:generate-recurring')->assertExitCode(0);

        $invoices = Invoice::withoutGlobalScopes()->orderBy('id')->get();
        $this->assertCount(2, $invoices);

        $next = $invoices->last();
        $this->assertEquals('sent', $next->status);
        $this->assertEquals(1150.00, (float) $next->total);
        $this->assertNotNull($next->zatca_qr_code);

        // The template's own next_recurrence_date must have advanced too,
        // so a second run right away doesn't generate a duplicate.
        $this->artisan('invoices:generate-recurring')->assertExitCode(0);
        $this->assertCount(2, Invoice::withoutGlobalScopes()->get());

        // Every posted journal entry must balance.
        foreach ($invoices as $inv) {
            $entry = $inv->company->journalEntries()->where('source_type', 'invoice')->where('source_id', $inv->id)->first();
            $this->assertNotNull($entry);
            $this->assertEquals((string) $entry->total_debit, (string) $entry->total_credit);
        }
    }

    public function test_command_does_not_touch_non_recurring_invoices(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'One-off Client'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'items' => [['description' => 'One-off job', 'quantity' => 1, 'unit_price' => 500, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)->assertOk();

        $this->artisan(GenerateRecurringInvoices::class)->assertExitCode(0);

        $this->assertEquals(1, Invoice::withoutGlobalScopes()->count());
    }
}
