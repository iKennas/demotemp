<?php

namespace Tests\Feature;

use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
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
            'company_name' => 'Dashboard Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@dashboardtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

    public function test_mark_overdue_command_flips_status_only_for_invoices_past_due_date(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'X'], $headers)->assertCreated()->json('data');

        $overdue = $this->postJson('/api/invoices', [
            'type' => 'sales', 'customer_id' => $customer['id'],
            'issue_date' => '2020-01-01', 'due_date' => '2020-01-15',
            'items' => [['description' => 'X', 'quantity' => 1, 'unit_price' => 100, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');
        $this->postJson("/api/invoices/{$overdue['id']}/send", [], $headers)->assertOk();

        $notYetDue = $this->postJson('/api/invoices', [
            'type' => 'sales', 'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(), 'due_date' => now()->addMonth()->toDateString(),
            'items' => [['description' => 'X', 'quantity' => 1, 'unit_price' => 100, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');
        $this->postJson("/api/invoices/{$notYetDue['id']}/send", [], $headers)->assertOk();

        $this->artisan('invoices:mark-overdue')->assertExitCode(0);

        $this->assertEquals('overdue', Invoice::withoutGlobalScopes()->find($overdue['id'])->status);
        $this->assertEquals('sent', Invoice::withoutGlobalScopes()->find($notYetDue['id'])->status);
    }

    public function test_dashboard_summary_only_includes_sections_the_user_can_see(): void
    {
        $ownerToken = $this->registerCompany();

        $this->asToken($ownerToken, 'POST', '/api/users', [
            'name' => 'Employee', 'email' => 'employee@dashboardtest.sa',
            'password' => 'password123', 'role' => 'Employee',
        ])->assertCreated();

        $ownerSummary = $this->asToken($ownerToken, 'GET', '/api/dashboard/summary')->assertOk()->json();
        $this->assertArrayHasKey('monthly_trend', $ownerSummary);
        $this->assertArrayHasKey('recent_invoices', $ownerSummary);
        $this->assertArrayHasKey('recent_payments', $ownerSummary);
        $this->assertArrayHasKey('low_stock', $ownerSummary);

        $this->forgetAuthenticatedGuards();
        $employeeToken = $this->postJson('/api/auth/login', [
            'email' => 'employee@dashboardtest.sa', 'password' => 'password123',
        ])->assertOk()->json('token');

        // Employee role only has invoices.view - no finance/cash/inventory access.
        $employeeSummary = $this->asToken($employeeToken, 'GET', '/api/dashboard/summary')->assertOk()->json();
        $this->assertArrayNotHasKey('monthly_trend', $employeeSummary);
        $this->assertArrayHasKey('recent_invoices', $employeeSummary);
        $this->assertArrayNotHasKey('recent_payments', $employeeSummary);
        $this->assertArrayNotHasKey('low_stock', $employeeSummary);
    }

    private function asToken(string $token, string $method, string $uri, array $data = []): \Illuminate\Testing\TestResponse
    {
        $this->forgetAuthenticatedGuards();

        return $this->json($method, $uri, $data, ['Authorization' => "Bearer {$token}"]);
    }
}
