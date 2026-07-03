<?php

namespace App\Services;

/**
 * Builds a ZATCA Phase-1 compliant base64 TLV QR payload (seller name, VAT
 * number, timestamp, invoice total, VAT total). This covers the simplified
 * "basic tax invoice" QR requirement; ZATCA Phase 2 (cryptographic stamping,
 * UUID, XML invoice, clearance API) is out of scope for this scaffold.
 */
class ZatcaQrCodeGenerator
{
    public static function generate(string $sellerName, string $vatNumber, \DateTimeInterface $timestamp, float $total, float $vatTotal): string
    {
        $tags = [
            [1, $sellerName],
            [2, $vatNumber],
            [3, $timestamp->format(DATE_ATOM)],
            [4, number_format($total, 2, '.', '')],
            [5, number_format($vatTotal, 2, '.', '')],
        ];

        $binary = '';
        foreach ($tags as [$tag, $value]) {
            $binary .= chr($tag).chr(strlen($value)).$value;
        }

        return base64_encode($binary);
    }
}
