<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,
            RolePermissionSeeder::class,
        ]);

        $registrar = app(PermissionRegistrar::class);

        $registrar->setPermissionsTeamId(Company::PLATFORM_TEAM_ID);
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@urs.sa'],
            ['name' => 'Platform Admin', 'password' => 'password', 'company_id' => null]
        );
        $superAdmin->assignRole('Super Admin');

        $company = Company::firstOrCreate(
            ['email' => 'demo@urs.sa'],
            [
                'name' => 'Demo Company',
                'plan_id' => Plan::where('name', 'Professional')->first()?->id,
                'currency' => 'SAR',
                'country' => 'SA',
                'status' => 'trial',
            ]
        );
        $company->provisionDefaultRoles();

        $registrar->setPermissionsTeamId($company->id);
        $owner = User::firstOrCreate(
            ['email' => 'owner@demo.urs.sa'],
            ['name' => 'Demo Owner', 'password' => 'password', 'company_id' => $company->id]
        );
        $owner->assignRole('Company Owner');
    }
}
