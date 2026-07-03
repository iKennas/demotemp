<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Automatically writes an AuditLog row on create/update/delete for any model
 * that uses this trait. Attributes listed in $auditExcept (or the model's
 * own $hidden, e.g. password) are stripped from the logged diff.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            self::log($model, 'created', $model->only(self::auditableAttributes($model)));
        });

        static::updated(function (Model $model) {
            $changes = collect($model->getChanges())
                ->except(array_merge(['updated_at'], $model->getHidden()))
                ->all();

            if ($changes === []) {
                return;
            }

            $original = collect($model->getOriginal())->only(array_keys($changes))->all();

            self::log($model, 'updated', ['before' => $original, 'after' => $changes]);
        });

        static::deleted(function (Model $model) {
            self::log($model, 'deleted', $model->only(self::auditableAttributes($model)));
        });
    }

    protected static function auditableAttributes(Model $model): array
    {
        return array_diff(array_keys($model->getAttributes()), $model->getHidden());
    }

    protected static function log(Model $model, string $action, array $changes): void
    {
        AuditLog::create([
            'company_id' => $model->company_id ?? auth()->user()?->company_id,
            'user_id' => auth()->id(),
            'action' => $action,
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'description' => static::auditDescription($model, $action),
            'changes' => $changes,
            'ip_address' => request()?->ip(),
        ]);
    }

    protected static function auditDescription(Model $model, string $action): string
    {
        $label = class_basename($model);
        $name = $model->name ?? $model->invoice_number ?? $model->entry_number ?? $model->payment_number
            ?? $model->expense_number ?? $model->revenue_number ?? $model->email ?? "#{$model->getKey()}";

        return "{$label} {$name} {$action}";
    }
}
