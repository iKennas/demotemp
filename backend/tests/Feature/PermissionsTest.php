<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function asToken(string $token, string $method, string $uri, array $data = []): TestResponse
    {
        $this->forgetAuthenticatedGuards();

        return $this->json($method, $uri, $data, ['Authorization' => "Bearer {$token}"]);
    }

    public function test_an_invited_employee_cannot_manage_users_but_can_view_invoices(): void
    {
        $ownerToken = $this->postJson('/api/auth/register', [
            'company_name' => 'Perm Test Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@permtest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');

        $this->asToken($ownerToken, 'POST', '/api/users', [
            'name' => 'Employee One',
            'email' => 'employee@permtest.sa',
            'password' => 'password123',
            'role' => 'Employee',
        ])->assertCreated();

        $this->forgetAuthenticatedGuards();
        $employeeToken = $this->postJson('/api/auth/login', [
            'email' => 'employee@permtest.sa',
            'password' => 'password123',
        ])->assertOk()->json('token');

        // Employee has invoices.view but not users.manage.
        $this->asToken($employeeToken, 'GET', '/api/invoices')->assertOk();
        $this->asToken($employeeToken, 'POST', '/api/users', [
            'name' => 'X', 'email' => 'x@permtest.sa', 'password' => 'password123', 'role' => 'Employee',
        ])->assertForbidden();

        // Employee cannot create invoices (no invoices.manage).
        $this->asToken($employeeToken, 'POST', '/api/invoices', [
            'type' => 'sales', 'issue_date' => now()->toDateString(), 'items' => [],
        ])->assertForbidden();
    }

    public function test_a_company_must_always_keep_at_least_one_company_owner(): void
    {
        $ownerToken = $this->postJson('/api/auth/register', [
            'company_name' => 'Sole Owner Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@soleowner.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');

        $me = $this->asToken($ownerToken, 'GET', '/api/auth/me')->json('user');

        $this->asToken($ownerToken, 'DELETE', "/api/users/{$me['id']}")
            ->assertStatus(422);
    }
}
