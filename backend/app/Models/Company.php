<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Database\Seeders\RolePermissionSeeder;
use Spatie\Permission\Models\Role;

#[Fillable([
    'name', 'legal_name', 'tax_number', 'commercial_registration', 'email', 'phone',
    'address', 'city', 'country', 'currency', 'fiscal_year_start', 'logo_path',
    'plan_id', 'status', 'settings',
])]
class Company extends Model
{
    use Auditable, SoftDeletes;

    /**
     * Spatie's teams pivot tables use company_id as a NOT NULL primary-key
     * column, so the platform-level Super Admin role (which belongs to no
     * real company) is stored under this reserved sentinel id instead of null.
     */
    public const PLATFORM_TEAM_ID = 0;

    protected function casts(): array
    {
        return [
            'fiscal_year_start' => 'date',
            'settings' => 'array',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasMany
    {
        return $this->subscriptions()->whereIn('status', ['trial', 'active']);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    /**
     * Creates this company's Company Owner / Accountant / Employee roles
     * with their default permission sets. Called once when a company is
     * onboarded so Company::users() can be assigned a role immediately.
     */
    public function provisionDefaultRoles(): void
    {
        foreach (['Company Owner', 'Accountant', 'Employee'] as $roleName) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
                'company_id' => $this->id,
            ]);
            $role->syncPermissions(RolePermissionSeeder::permissionsForRole($roleName));
        }
    }
}
