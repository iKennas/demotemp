<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Thin wrapper around Moyasar's REST API (https://docs.moyasar.com) for
 * one-off subscription payments. NOT verified against a live Moyasar
 * account - MOYASAR_SECRET_KEY/MOYASAR_PUBLISHABLE_KEY are empty by
 * default (see .env.example), so this will throw until real sandbox/live
 * keys are configured. Built to the documented API shape; re-verify field
 * names against Moyasar's docs once credentials are available.
 *
 * Moyasar does not offer built-in recurring subscriptions the way Stripe
 * does - each billing cycle needs its own createPayment() call (typically
 * triggered by a scheduled command checking Subscription::ends_at).
 */
class MoyasarService
{
    private string $baseUrl = 'https://api.moyasar.com/v1';

    public function createPayment(array $params): array
    {
        $secretKey = config('services.moyasar.secret_key');
        abort_if(empty($secretKey), 500, 'Moyasar is not configured (MOYASAR_SECRET_KEY missing).');

        $response = Http::withBasicAuth($secretKey, '')
            ->asForm()
            ->post("{$this->baseUrl}/payments", $params);

        if ($response->failed()) {
            throw new \RuntimeException('Moyasar payment creation failed: '.$response->body());
        }

        return $response->json();
    }

    public function fetchPayment(string $paymentId): array
    {
        $secretKey = config('services.moyasar.secret_key');
        abort_if(empty($secretKey), 500, 'Moyasar is not configured (MOYASAR_SECRET_KEY missing).');

        $response = Http::withBasicAuth($secretKey, '')->get("{$this->baseUrl}/payments/{$paymentId}");

        if ($response->failed()) {
            throw new \RuntimeException('Moyasar payment fetch failed: '.$response->body());
        }

        return $response->json();
    }
}
