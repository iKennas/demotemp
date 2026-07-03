<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default permission set for each of the spec's built-in company roles
     * (Company Owner, Accountant, Employee). Companies can still define
     * custom roles on top of this via the same permission catalog.
     */
    public static function permissionsForRole(string $role): array
    {
        return match ($role) {
            'Company Owner' => self::allPermissionNames(),
            'Accountant' => [
                'finance.view', 'finance.manage',
                'invoices.view', 'invoices.manage',
                'cash.view', 'cash.manage',
                'customers.view', 'suppliers.view',
                'reports.view', 'audit.view',
            ],
            'Employee' => [
                'invoices.view', 'customers.view', 'suppliers.view',
            ],
            default => [],
        };
    }

    public static function allPermissionNames(): array
    {
        $names = [];
        foreach (config('permissions_list') as $module => $actions) {
            foreach ($actions as $action) {
                $names[] = "{$module}.{$action}";
            }
        }

        return $names;
    }

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::allPermissionNames() as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdmin = Role::firstOrCreate(
            ['name' => 'Super Admin', 'guard_name' => 'web', 'company_id' => Company::PLATFORM_TEAM_ID]
        );
        $superAdmin->syncPermissions(self::allPermissionNames());
    }
}
