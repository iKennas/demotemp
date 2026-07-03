<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Company;

/**
 * Seeds a standard starter chart of accounts for a newly onboarded company.
 * The codes marked is_system are relied on by JournalPostingService to
 * auto-post invoices/payments/expenses/revenues without per-company setup.
 */
class ChartOfAccountsSeeder
{
    public const CASH = '1000';

    public const ACCOUNTS_RECEIVABLE = '1100';

    public const INVENTORY = '1200';

    public const ACCOUNTS_PAYABLE = '2000';

    public const VAT_PAYABLE = '2100';

    public const OWNERS_EQUITY = '3000';

    public const RETAINED_EARNINGS = '3900';

    public const SALES_REVENUE = '4000';

    public const COST_OF_GOODS_SOLD = '5000';

    public const GENERAL_EXPENSES = '5900';

    public static function seed(Company $company): void
    {
        $accounts = [
            [self::CASH, 'Cash', 'الصندوق', 'asset', 'debit'],
            [self::ACCOUNTS_RECEIVABLE, 'Accounts Receivable', 'ذمم العملاء', 'asset', 'debit'],
            [self::INVENTORY, 'Inventory', 'المخزون', 'asset', 'debit'],
            [self::ACCOUNTS_PAYABLE, 'Accounts Payable', 'ذمم الموردين', 'liability', 'credit'],
            [self::VAT_PAYABLE, 'VAT Payable', 'ضريبة القيمة المضافة المستحقة', 'liability', 'credit'],
            [self::OWNERS_EQUITY, "Owner's Equity", 'حقوق الملكية', 'equity', 'credit'],
            [self::RETAINED_EARNINGS, 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 'credit'],
            [self::SALES_REVENUE, 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 'credit'],
            [self::COST_OF_GOODS_SOLD, 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'expense', 'debit'],
            [self::GENERAL_EXPENSES, 'General Expenses', 'مصروفات عمومية', 'expense', 'debit'],
        ];

        foreach ($accounts as [$code, $name, $nameAr, $type, $normalBalance]) {
            Account::firstOrCreate(
                ['company_id' => $company->id, 'code' => $code],
                [
                    'name' => $name,
                    'name_ar' => $nameAr,
                    'type' => $type,
                    'normal_balance' => $normalBalance,
                    'currency' => $company->currency,
                    'is_system' => true,
                ]
            );
        }
    }
}
