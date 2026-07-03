<?php

use App\Console\Commands\GenerateRecurringInvoices;
use App\Console\Commands\SendLowStockAlerts;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(GenerateRecurringInvoices::class)->dailyAt('01:00');
Schedule::command(SendLowStockAlerts::class)->dailyAt('07:00');
