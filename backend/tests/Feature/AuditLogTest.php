<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Sanctum's token guard caches the resolved user across simulated
     * requests within one PHPUnit process, so every authenticated call
     * that might use a different user's token than the previous one must
     * force a fresh guard resolution first.
     */
    private function asToken(string $token, string $method, string $uri, array $data = []): TestResponse
    {
        $this->forgetAuthenticatedGuards();

        return $this->json($method, $uri, $data, ['Authorization' => "Bearer {$token}"]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function registerCompany(string $email = 'owner@audittest.sa'): string
    {
        return $this->postJson('/api/auth/register', [
            'company_name' => 'Audit Co',
            'owner_name' => 'Owner',
            'owner_email' => $email,
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

    public function test_creating_and_updating_a_customer_writes_audit_log_entries(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'Original Name'], $headers)
            ->assertCreated()->json('data');

        $this->putJson("/api/customers/{$customer['id']}", ['name' => 'Renamed'], $headers)->assertOk();

        $logs = $this->getJson('/api/audit-logs?action=created', $headers)->assertOk()->json('data');
        $created = collect($logs)->firstWhere(fn ($l) => $l['auditable_type'] === 'App\\Models\\Customer');
        $this->assertNotNull($created);
        $this->assertEquals('Original Name', $created['changes']['name']);

        $updateLogs = $this->getJson('/api/audit-logs?action=updated', $headers)->assertOk()->json('data');
        $updated = collect($updateLogs)->firstWhere(fn ($l) => $l['auditable_type'] === 'App\\Models\\Customer');
        $this->assertNotNull($updated);
        $this->assertEquals('Original Name', $updated['changes']['before']['name']);
        $this->assertEquals('Renamed', $updated['changes']['after']['name']);
    }

    public function test_deleting_a_customer_writes_a_deleted_audit_log_entry(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'To Delete'], $headers)
            ->assertCreated()->json('data');

        $this->deleteJson("/api/customers/{$customer['id']}", [], $headers)->assertNoContent();

        $logs = $this->getJson('/api/audit-logs?action=deleted', $headers)->assertOk()->json('data');
        $deleted = collect($logs)->firstWhere(fn ($l) => $l['auditable_type'] === 'App\\Models\\Customer' && $l['auditable_id'] === $customer['id']);
        $this->assertNotNull($deleted);
    }

    public function test_audit_logs_are_isolated_per_company(): void
    {
        $tokenA = $this->registerCompany('owner-a@audittest.sa');
        $tokenB = $this->registerCompany('owner-b@audittest.sa');

        $this->asToken($tokenA, 'POST', '/api/customers', ['name' => 'Company A Customer'])->assertCreated();

        $logsB = $this->asToken($tokenB, 'GET', '/api/audit-logs')->assertOk()->json('data');
        $leaked = collect($logsB)->firstWhere(fn ($l) => $l['description'] === 'Customer Company A Customer created');
        $this->assertNull($leaked);
    }

    public function test_password_is_never_exposed_in_audit_log_changes(): void
    {
        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson('/api/users', [
            'name' => 'New Employee',
            'email' => 'employee@audittest.sa',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'Employee',
        ], $headers)->assertCreated();

        $logs = $this->getJson('/api/audit-logs?action=created', $headers)->assertOk()->json('data');
        $userLog = collect($logs)->firstWhere(fn ($l) => $l['auditable_type'] === 'App\\Models\\User' && str_contains($l['description'], 'New Employee'));

        $this->assertNotNull($userLog);
        $this->assertArrayNotHasKey('password', $userLog['changes']);
    }
}
