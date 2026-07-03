<?php

namespace App\Console\Commands;

use App\Mail\LowStockAlertMail;
use App\Models\Company;
use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\PermissionRegistrar;

#[Signature('inventory:send-low-stock-alerts')]
#[Description('Emails each company\'s owners a digest of products at or below their reorder level.')]
class SendLowStockAlerts extends Command
{
    public function handle(PermissionRegistrar $registrar): int
    {
        $companies = Company::where('status', '!=', 'suspended')->get();
        $sent = 0;

        foreach ($companies as $company) {
            $lowStock = Product::withoutGlobalScopes()
                ->where('company_id', $company->id)
                ->where('track_inventory', true)
                ->whereNotNull('reorder_level')
                ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
                ->where('is_active', true)
                ->get();

            if ($lowStock->isEmpty()) {
                continue;
            }

            $registrar->setPermissionsTeamId($company->id);
            $owners = User::where('company_id', $company->id)->role('Company Owner')->whereNotNull('email')->get();

            foreach ($owners as $owner) {
                Mail::to($owner->email)->send(new LowStockAlertMail($company, $lowStock));
                $sent++;
            }
        }

        $this->info("Sent {$sent} low-stock alert email(s).");

        return self::SUCCESS;
    }
}
