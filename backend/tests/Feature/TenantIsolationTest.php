<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function registerCompany(string $name, string $email): string
    {
        return $this->postJson('/api/auth/register', [
            'company_name' => $name,
            'owner_name' => 'Owner',
            'owner_email' => $email,
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

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

    public function test_a_company_cannot_see_another_companys_customers(): void
    {
        $tokenA = $this->registerCompany('Company A', 'a@tenant.sa');
        $tokenB = $this->registerCompany('Company B', 'b@tenant.sa');

        $customer = $this->asToken($tokenA, 'POST', '/api/customers', ['name' => 'A-only Client'])
            ->assertCreated()->json('data');

        // Company B's list must not include it.
        $this->asToken($tokenB, 'GET', '/api/customers')
            ->assertOk()
            ->assertJsonMissing(['name' => 'A-only Client']);

        // Company B cannot fetch it directly by ID either.
        $this->asToken($tokenB, 'GET', "/api/customers/{$customer['id']}")
            ->assertNotFound();
    }

    public function test_a_company_cannot_see_another_companys_chart_of_accounts(): void
    {
        $tokenA = $this->registerCompany('Company C', 'c@tenant.sa');
        $tokenB = $this->registerCompany('Company D', 'd@tenant.sa');

        $accountsA = $this->asToken($tokenA, 'GET', '/api/accounts')->json('data');
        $accountsB = $this->asToken($tokenB, 'GET', '/api/accounts')->json('data');

        $idsA = collect($accountsA)->pluck('id')->all();
        $idsB = collect($accountsB)->pluck('id')->all();

        $this->assertEmpty(array_intersect($idsA, $idsB));
    }

    public function test_regular_company_user_cannot_access_platform_admin_routes(): void
    {
        $token = $this->registerCompany('Company E', 'e@tenant.sa');

        $this->asToken($token, 'GET', '/api/admin/companies')->assertForbidden();
    }
}
