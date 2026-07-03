<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'company_id', 'sku', 'name', 'name_ar', 'type', 'category', 'unit',
    'cost_price', 'sale_price', 'tax_rate', 'track_inventory', 'quantity_on_hand',
    'reorder_level', 'is_active', 'description',
])]
class Product extends Model
{
    use Auditable, BelongsToCompany, SoftDeletes;

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'quantity_on_hand' => 'decimal:3',
            'reorder_level' => 'decimal:3',
            'track_inventory' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->track_inventory
            && $this->reorder_level !== null
            && $this->quantity_on_hand <= $this->reorder_level;
    }
}
