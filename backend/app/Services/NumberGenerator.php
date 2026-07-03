<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;

/**
 * Generates simple sequential, per-company document numbers (JE-000001,
 * INV-000001, ...). Callers must run this inside the same DB transaction
 * that inserts the row, with the table locked via lockForUpdate on the
 * count query, to stay race-safe under concurrent requests.
 */
class NumberGenerator
{
    public static function next(Builder $query, string $prefix, int $companyId, string $companyColumn = 'company_id'): string
    {
        $count = $query->where($companyColumn, $companyId)->lockForUpdate()->count();

        return sprintf('%s-%06d', $prefix, $count + 1);
    }
}
