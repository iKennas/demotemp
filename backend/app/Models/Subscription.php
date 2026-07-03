<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_id', 'plan_id', 'status', 'starts_at', 'ends_at', 'trial_ends_at',
    'auto_renew', 'payment_gateway', 'payment_gateway_customer_id',
    'payment_gateway_subscription_id', 'last_payment_at',
])]
class Subscription extends Model
{
    use BelongsToCompany;

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'last_payment_at' => 'datetime',
            'auto_renew' => 'boolean',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
