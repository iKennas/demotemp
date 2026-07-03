<?php

namespace Tests\Feature;

use App\Mail\LowStockAlertMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LowStockAlertsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function registerCompany(string $email = 'owner@lowstock.sa'): string
    {
        return $this->postJson('/api/auth/register', [
            'company_name' => 'Low Stock Co',
            'owner_name' => 'Owner',
            'owner_email' => $email,
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
    }

    public function test_command_emails_the_owner_when_a_product_is_at_or_below_reorder_level(): void
    {
        Mail::fake();

        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson('/api/products', [
            'name' => 'Critical Widget', 'sale_price' => 20,
            'track_inventory' => true, 'quantity_on_hand' => 2, 'reorder_level' => 5,
        ], $headers)->assertCreated();

        $this->postJson('/api/products', [
            'name' => 'Well Stocked Widget', 'sale_price' => 20,
            'track_inventory' => true, 'quantity_on_hand' => 100, 'reorder_level' => 5,
        ], $headers)->assertCreated();

        $this->artisan('inventory:send-low-stock-alerts')->assertExitCode(0);

        Mail::assertSent(LowStockAlertMail::class, function (LowStockAlertMail $mail) {
            return $mail->products->count() === 1
                && $mail->products->first()->name === 'Critical Widget';
        });
    }

    public function test_command_sends_no_email_when_nothing_is_low(): void
    {
        Mail::fake();

        $token = $this->registerCompany();
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson('/api/products', [
            'name' => 'Plenty Widget', 'sale_price' => 20,
            'track_inventory' => true, 'quantity_on_hand' => 100, 'reorder_level' => 5,
        ], $headers)->assertCreated();

        $this->artisan('inventory:send-low-stock-alerts')->assertExitCode(0);

        Mail::assertNothingSent();
    }
}
