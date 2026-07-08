<?php

namespace App\Models\Concerns;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Scopes a model to the authenticated user's company and auto-fills
 * company_id on create, so every query automatically stays tenant-isolated.
 */
trait BelongsToCompany
{
    private static function resolveTenantCompanyId(): ?int
    {
        if (! auth()->check()) {
            return null;
        }

        $companyId = auth()->user()->company_id;
        if ($companyId) {
            return (int) $companyId;
        }

        // Demo fallback: let platform admins without a company work against the
        // seeded demo company instead of crashing on company_id constraints.
        if (auth()->user()->hasRole('Super Admin')) {
            return Company::query()->orderBy('id')->value('id');
        }

        return null;
    }

    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $builder) {
            $tenantCompanyId = self::resolveTenantCompanyId();
            if ($tenantCompanyId) {
                $builder->where($builder->getModel()->getTable().'.company_id', $tenantCompanyId);
            }
        });

        static::creating(function ($model) {
            if (! $model->company_id) {
                $model->company_id = self::resolveTenantCompanyId();
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
