<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'company_id', 'code', 'name', 'type', 'classification', 'email', 'phone',
    'tax_number', 'address', 'city', 'country', 'credit_limit', 'opening_balance',
    'status', 'notes',
])]
class Customer extends Model
{
    use Auditable, BelongsToCompany, SoftDeletes;

    protected function casts(): array
    {
        return [
            'credit_limit' => 'decimal:2',
            'opening_balance' => 'decimal:2',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function outstandingBalance(): float
    {
        return (float) $this->invoices()
            ->where('type', 'sales')
            ->whereIn('status', ['sent', 'partially_paid', 'overdue'])
            ->sum('total')
            - (float) $this->invoices()
                ->where('type', 'sales')
                ->whereIn('status', ['sent', 'partially_paid', 'overdue'])
                ->sum('paid_amount');
    }
}
