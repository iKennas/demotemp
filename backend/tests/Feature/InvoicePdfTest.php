<?php

namespace Tests\Feature;

use App\Mail\InvoiceMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InvoicePdfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    private function sentInvoice(): array
    {
        $token = $this->postJson('/api/auth/register', [
            'company_name' => 'PDF Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@pdftest2.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'PDF Client', 'email' => 'client@pdftest2.sa'], $headers)
            ->assertCreated()->json('data');

        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales',
            'customer_id' => $customer['id'],
            'issue_date' => now()->toDateString(),
            'items' => [['description' => 'Design work', 'quantity' => 1, 'unit_price' => 800, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->postJson("/api/invoices/{$invoice['id']}/send", [], $headers)->assertOk();

        return [$headers, $invoice['id']];
    }

    public function test_draft_invoices_cannot_be_downloaded_as_pdf(): void
    {
        $token = $this->postJson('/api/auth/register', [
            'company_name' => 'Draft Co',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@drafttest.sa',
            'owner_password' => 'password123',
            'owner_password_confirmation' => 'password123',
        ])->assertCreated()->json('token');
        $headers = ['Authorization' => "Bearer {$token}"];

        $customer = $this->postJson('/api/customers', ['name' => 'X'], $headers)->assertCreated()->json('data');
        $invoice = $this->postJson('/api/invoices', [
            'type' => 'sales', 'customer_id' => $customer['id'], 'issue_date' => now()->toDateString(),
            'items' => [['description' => 'X', 'quantity' => 1, 'unit_price' => 10, 'tax_rate' => 15]],
        ], $headers)->assertCreated()->json('data');

        $this->getJson("/api/invoices/{$invoice['id']}/pdf", $headers)->assertStatus(422);
    }

    public function test_sent_invoice_pdf_downloads_as_a_valid_pdf(): void
    {
        [$headers, $invoiceId] = $this->sentInvoice();

        $response = $this->get("/api/invoices/{$invoiceId}/pdf", $headers);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_emailing_an_invoice_sends_to_the_customers_email_with_pdf_attached(): void
    {
        Mail::fake();
        [$headers, $invoiceId] = $this->sentInvoice();

        $this->postJson("/api/invoices/{$invoiceId}/email", [], $headers)
            ->assertOk()
            ->assertJson(['message' => 'Invoice emailed to client@pdftest2.sa.']);

        Mail::assertSent(InvoiceMail::class, function (InvoiceMail $mail) {
            return $mail->hasTo('client@pdftest2.sa') && ! empty($mail->pdfContent);
        });
    }

    public function test_emailing_an_invoice_can_override_the_recipient(): void
    {
        Mail::fake();
        [$headers, $invoiceId] = $this->sentInvoice();

        $this->postJson("/api/invoices/{$invoiceId}/email", ['to' => 'other@test.sa'], $headers)
            ->assertOk()
            ->assertJson(['message' => 'Invoice emailed to other@test.sa.']);

        Mail::assertSent(InvoiceMail::class, fn (InvoiceMail $mail) => $mail->hasTo('other@test.sa'));
    }
}
