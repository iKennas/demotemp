<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MoyasarService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function show(Request $request)
    {
        $company = $request->user()->company()->with('plan')->first();
        if (! $company) {
            // Platform-level roles may not be tied to a real company.
            // Avoid 500s and let the frontend render an empty billing state.
            return response()->json(['data' => null, 'plan' => null, 'company_status' => null]);
        }

        $subscription = $company->subscriptions()->latest('id')->first();

        return response()->json(['data' => $subscription, 'plan' => $company->plan, 'company_status' => $company->status]);
    }

    /**
     * Starts a Moyasar payment for the company's current plan price, so the
     * frontend can redirect the user to Moyasar's hosted checkout (or embed
     * their JS SDK using the returned publishable key). On successful
     * payment, Moyasar calls back to WebhookController@moyasar, which
     * activates the subscription - see that controller for the other half
     * of this flow.
     */
    public function checkout(Request $request, MoyasarService $moyasar)
    {
        $company = $request->user()->company;
        $plan = $company->plan;
        abort_if(! $plan, 422, 'Company has no plan assigned.');

        $subscription = $company->subscriptions()->latest('id')->first();
        abort_if(! $subscription, 422, 'Company has no subscription record.');

        $payment = $moyasar->createPayment([
            'amount' => (int) round($plan->price * 100), // halalas
            'currency' => 'SAR',
            'description' => "URS subscription - {$plan->name} ({$company->name})",
            'callback_url' => config('app.url').'/api/webhooks/moyasar',
            'metadata' => [
                'company_id' => $company->id,
                'subscription_id' => $subscription->id,
            ],
        ]);

        $subscription->update([
            'payment_gateway' => 'moyasar',
            'payment_gateway_subscription_id' => $payment['id'] ?? null,
        ]);

        return response()->json([
            'data' => $payment,
            'publishable_key' => config('services.moyasar.publishable_key'),
        ]);
    }
}
