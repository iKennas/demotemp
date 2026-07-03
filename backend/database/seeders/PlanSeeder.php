<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Basic',
                'name_ar' => 'أساسي',
                'price' => 99,
                'billing_cycle' => 'monthly',
                'max_users' => 3,
                'max_invoices_per_month' => 50,
                'features' => ['financial_module', 'customers', 'suppliers', 'invoices'],
            ],
            [
                'name' => 'Professional',
                'name_ar' => 'احترافي',
                'price' => 249,
                'billing_cycle' => 'monthly',
                'max_users' => 10,
                'max_invoices_per_month' => 500,
                'features' => ['financial_module', 'customers', 'suppliers', 'invoices', 'inventory', 'cash_flow'],
            ],
            [
                'name' => 'Enterprise',
                'name_ar' => 'المؤسسات',
                'price' => 599,
                'billing_cycle' => 'monthly',
                'max_users' => null,
                'max_invoices_per_month' => null,
                'features' => ['financial_module', 'customers', 'suppliers', 'invoices', 'inventory', 'cash_flow', 'custom_roles', 'priority_support'],
            ],
        ];

        foreach ($plans as $plan) {
            Plan::firstOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
