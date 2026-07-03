<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id', 'parent_id', 'code', 'name', 'name_ar', 'type', 'subtype',
    'normal_balance', 'currency', 'opening_balance', 'description', 'is_active', 'is_system',
])]
class Account extends Model
{
    use Auditable, BelongsToCompany;

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    /**
     * Net posted balance for this account (sum of debits minus credits,
     * flipped for credit-normal accounts) computed from journal entry lines.
     */
    public function balance(): float
    {
        $sums = $this->journalEntryLines()
            ->whereHas('journalEntry', fn ($q) => $q->where('status', 'posted'))
            ->selectRaw('COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(credit), 0) as credit')
            ->first();

        $net = (float) $sums->debit - (float) $sums->credit;

        return $this->normal_balance === 'debit' ? $net : -$net;
    }
}
