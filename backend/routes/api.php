<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BankTransferController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::post('webhooks/moyasar', [WebhookController::class, 'moyasar']);

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::get('dashboard/summary', [DashboardController::class, 'summary']);

    // Financial module - chart of accounts, journal entries, reports
    Route::middleware('permission:finance.view')->group(function () {
        Route::apiResource('accounts', AccountController::class)->only(['index', 'show']);
        Route::apiResource('journal-entries', JournalEntryController::class)->only(['index', 'show']);
        Route::get('reports/trial-balance', [ReportController::class, 'trialBalance']);
        Route::get('reports/general-ledger/{account}', [ReportController::class, 'generalLedger']);
        Route::get('reports/profit-and-loss', [ReportController::class, 'profitAndLoss']);
        Route::get('reports/balance-sheet', [ReportController::class, 'balanceSheet']);
    });
    Route::middleware('permission:finance.manage')->group(function () {
        Route::apiResource('accounts', AccountController::class)->except(['index', 'show']);
        Route::apiResource('journal-entries', JournalEntryController::class)->except(['index', 'show']);
        Route::post('journal-entries/{journal_entry}/post', [JournalEntryController::class, 'post']);
        Route::post('journal-entries/{journal_entry}/void', [JournalEntryController::class, 'void']);
    });

    // Customers
    Route::middleware('permission:customers.view')->group(function () {
        Route::apiResource('customers', CustomerController::class)->only(['index', 'show']);
        Route::get('customers/{customer}/statement', [CustomerController::class, 'statement']);
    });
    Route::middleware('permission:customers.manage')->group(function () {
        Route::apiResource('customers', CustomerController::class)->except(['index', 'show']);
    });

    // Suppliers
    Route::middleware('permission:suppliers.view')->group(function () {
        Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show']);
        Route::get('suppliers/{supplier}/statement', [SupplierController::class, 'statement']);
    });
    Route::middleware('permission:suppliers.manage')->group(function () {
        Route::apiResource('suppliers', SupplierController::class)->except(['index', 'show']);
    });

    // Invoices
    Route::middleware('permission:invoices.view')->group(function () {
        Route::apiResource('invoices', InvoiceController::class)->only(['index', 'show']);
        Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    });
    Route::middleware('permission:invoices.manage')->group(function () {
        Route::apiResource('invoices', InvoiceController::class)->except(['index', 'show']);
        Route::post('invoices/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void']);
        Route::post('invoices/{invoice}/email', [InvoiceController::class, 'email']);
    });

    // Cash: payments, expenses, revenues, bank accounts & transfers
    Route::middleware('permission:cash.view')->group(function () {
        Route::apiResource('payments', PaymentController::class)->only(['index', 'show']);
        Route::apiResource('expenses', ExpenseController::class)->only(['index', 'show']);
        Route::apiResource('revenues', RevenueController::class)->only(['index', 'show']);
        Route::apiResource('bank-accounts', BankAccountController::class)->only(['index', 'show']);
        Route::apiResource('bank-transfers', BankTransferController::class)->only(['index', 'show']);
    });
    Route::middleware('permission:cash.manage')->group(function () {
        Route::apiResource('payments', PaymentController::class)->only(['store', 'destroy']);
        Route::apiResource('expenses', ExpenseController::class)->only(['store', 'destroy']);
        Route::apiResource('revenues', RevenueController::class)->only(['store', 'destroy']);
        Route::apiResource('bank-accounts', BankAccountController::class)->except(['index', 'show']);
        Route::apiResource('bank-transfers', BankTransferController::class)->only(['store', 'destroy']);
    });

    // Inventory
    Route::middleware('permission:inventory.view')->group(function () {
        Route::apiResource('products', ProductController::class)->only(['index', 'show']);
    });
    Route::middleware('permission:inventory.manage')->group(function () {
        Route::apiResource('products', ProductController::class)->except(['index', 'show']);
        Route::post('products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);
    });

    // Company users (invite/roles) and company profile settings
    Route::middleware('permission:users.view')->group(function () {
        Route::apiResource('users', UserController::class)->only(['index', 'show']);
    });
    Route::middleware('permission:users.manage')->group(function () {
        Route::apiResource('users', UserController::class)->except(['index', 'show']);
    });
    Route::middleware('permission:settings.view')->get('company', [CompanyController::class, 'show']);
    Route::middleware('permission:settings.manage')->put('company', [CompanyController::class, 'update']);
    Route::middleware('permission:settings.view')->get('subscription', [SubscriptionController::class, 'show']);
    Route::middleware('permission:settings.manage')->post('subscription/checkout', [SubscriptionController::class, 'checkout']);

    // Platform admin - Super Admin only, spans all companies
    Route::prefix('admin')->middleware('role:Super Admin')->group(function () {
        Route::apiResource('companies', AdminCompanyController::class)->only(['index', 'show', 'update', 'destroy']);
        Route::apiResource('plans', AdminPlanController::class);
    });
});
