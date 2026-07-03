<?php

namespace App\Http\Controllers\Api;

use App\Models\Subscription;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Moyasar webhook receiver. Public route (no auth) - protected instead
     * by a shared secret_token query param, which is how Moyasar's webhook
     * config works (you append ?secret_token=... to the URL you register
     * with them, rather than a signed header). NOT verified against a live
     * webhook delivery - re-check the exact event/payload shape in
     * Moyasar's dashboard once this goes live, and adjust field names below
     * if they differ.
     */
    public function moyasar(Request $request)
    {
        $expected = config('services.moyasar.webhook_secret');
        if ($expected && $request->query('secret_token') !== $expected) {
            Log::warning('Rejected Moyasar webhook: bad secret_token.');
            abort(403);
        }

        $payment = $request->input('data', $request->all());
        $status = $payment['status'] ?? null;
        $subscriptionId = $payment['metadata']['subscription_id'] ?? null;

        if (! $subscriptionId) {
            Log::warning('Moyasar webhook missing metadata.subscription_id.', ['payload' => $request->all()]);

            return response()->json(['ok' => true]);
        }

        $subscription = Subscription::withoutGlobalScopes()->find($subscriptionId);
        if (! $subscription) {
            Log::warning("Moyasar webhook: subscription {$subscriptionId} not found.");

            return response()->json(['ok' => true]);
        }

        if ($status === 'paid') {
            $cycle = $subscription->plan->billing_cycle === 'yearly' ? '1 year' : '1 month';
            $subscription->update([
                'status' => 'active',
                'last_payment_at' => now(),
                'starts_at' => $subscription->starts_at ?? now(),
                'ends_at' => now()->modify('+'.$cycle),
            ]);
            $subscription->company()->update(['status' => 'active']);
        } elseif (in_array($status, ['failed', 'voided'], true)) {
            Log::info("Moyasar payment {$status} for subscription {$subscriptionId}.");
        }

        return response()->json(['ok' => true]);
    }
}
