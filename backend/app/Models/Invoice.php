<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'company_id', 'type', 'invoice_number', 'customer_id', 'supplier_id',
    'issue_date', 'due_date', 'status', 'currency', 'subtotal', 'discount_total',
    'tax_total', 'total', 'paid_amount', 'notes', 'is_recurring',
    'recurring_interval', 'next_recurrence_date', 'zatca_uuid', 'zatca_qr_code',
    'pdf_path', 'sent_at',
])]
class Invoice extends Model
{
    use Auditable, BelongsToCompany, SoftDeletes;

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'next_recurrence_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'is_recurring' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function balanceDue(): float
    {
        return (float) $this->total - (float) $this->paid_amount;
    }

    /**
     * Computes the next recurrence date from a given date based on this
     * invoice's recurring_interval (weekly, monthly, quarterly, yearly).
     */
    public function nextRecurrenceDateFrom(\DateTimeInterface $from): \Illuminate\Support\Carbon
    {
        $date = \Illuminate\Support\Carbon::parse($from);

        return match ($this->recurring_interval) {
            'weekly' => $date->addWeek(),
            'quarterly' => $date->addMonths(3),
            'yearly' => $date->addYear(),
            default => $date->addMonth(),
        };
    }
}
